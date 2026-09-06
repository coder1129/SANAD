import { ApiError, authApi, installAuthInterceptors } from '@/lib/api';
import { getQueryClient, resetQueryCache } from '@/lib/query';
import { useAuthStore } from '@/stores/auth-store';
import type {
  AuthMessageResult,
  AuthTokens,
  ChangePasswordInput,
  LoginCredentials,
  LoginResult,
  RegisterInput,
  RegisterResult,
  User,
} from '@/types/domain';

import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from './access-token';
import {
  clearSessionHint,
  hasSessionHint,
  setSessionHint,
} from './session-hint';

/**
 * The session engine: every transition an authenticated session can make lives
 * here, and nothing else in the application writes tokens or auth state.
 *
 * Deliberately plain functions rather than a hook or a context value, so the
 * Axios interceptors, the bootstrap, and future UI all drive the same code.
 * Nothing here navigates — where to go after signing in or out is a UI decision.
 */

/**
 * Counts identity changes. A refresh that started before a login or logout
 * completed must not write its rotated access token afterwards: it belongs to
 * the identity that has just been replaced, and storing it would revive it. Every
 * refresh captures the epoch at its start and discards its result if the epoch
 * moved on.
 */
let sessionEpoch = 0;

/** The shared refresh promise. Non-null exactly while a refresh is in flight. */
let refreshInFlight: Promise<string> | null = null;

/** Set once; a session is restored once per application lifecycle. */
let bootstrapPromise: Promise<void> | null = null;

let interceptorsInstalled = false;

/**
 * Installs the Authorization and 401 interceptors, once.
 *
 * Called from the auth provider's render pass rather than an effect: effects run
 * child-first, so a child component could otherwise fire its first request before
 * the interceptors existed. `installAuthInterceptors` is itself idempotent, which
 * covers hot reloads that re-evaluate this module.
 *
 * Browser-only: module state on the server is shared between concurrent requests,
 * so a server-side token holder could hand one visitor's token to another.
 */
export function ensureAuthInterceptors(): void {
  if (interceptorsInstalled || typeof window === 'undefined') return;

  installAuthInterceptors({
    getAccessToken,
    refreshSession: refreshAuthSession,
  });
  interceptorsInstalled = true;
}

/**
 * Restores the session on application startup, exactly once.
 *
 * The access token is gone after a reload by design. A non-sensitive local hint
 * tells us whether it is worth asking the backend to validate its HttpOnly
 * refresh cookie:
 *
 * - no hint → `anonymous`, no requests issued;
 * - hint present → rotate the cookie, load `GET /auth/me`, and settle on
 *   `authenticated` with a backend-confirmed user;
 * - any failed validation → clear local state and settle on `anonymous`.
 *
 * The promise is cached, so React's double-invoked effects in development, a
 * remount, or a concurrent caller all await the same restore instead of starting
 * a second one.
 */
export function bootstrapAuthSession(): Promise<void> {
  bootstrapPromise ??= runBootstrap();

  return bootstrapPromise;
}

async function runBootstrap(): Promise<void> {
  ensureAuthInterceptors();

  if (!hasSessionHint()) {
    useAuthStore.getState().setAnonymous();
    return;
  }

  const epoch = sessionEpoch;

  try {
    await refreshAuthSession();
    const user = await authApi.getCurrentUser();

    // A login or logout that completed while `/auth/me` was in flight owns the
    // session now; overwriting it here would replace the newer identity.
    if (epoch !== sessionEpoch) return;

    useAuthStore.getState().setAuthenticatedUser(user);
  } catch {
    if (epoch !== sessionEpoch) return;

    endSession();
  }
}

/**
 * Single-flight session refresh. Resolves with the new access token.
 *
 * Concurrent 401s are the normal case — a screen that loads three protected
 * queries produces three of them at once — and each must not start its own
 * refresh. The backend rotates and invalidates the presented refresh token, so
 * the second call would be answered with `REFRESH_TOKEN_REUSED` and would
 * destroy a session that was in fact healthy. Callers therefore share one
 * promise: the first request in wins, the rest await its outcome, and each then
 * replays with the token it produced.
 */
export function refreshAuthSession(): Promise<string> {
  if (refreshInFlight !== null) return refreshInFlight;

  const attempt = runRefresh().finally(() => {
    // Only clear if this is still the current attempt, so a refresh started
    // after this one cannot be dropped from the slot.
    if (refreshInFlight === attempt) refreshInFlight = null;
  });

  refreshInFlight = attempt;

  return attempt;
}

async function runRefresh(): Promise<string> {
  const epoch = sessionEpoch;

  let tokens: AuthTokens;
  try {
    tokens = await authApi.refresh();
  } catch (error) {
    // A failed refresh cannot establish a usable session. The backend owns and
    // expires the cookie; locally we clear access state and the session hint.
    endSession();

    throw error;
  }

  if (epoch !== sessionEpoch) {
    throw new ApiError({
      kind: 'unauthorized',
      message: 'The session changed while it was being refreshed',
    });
  }

  // The rotated refresh credential is already in an HttpOnly response cookie.
  // Only the short-lived access token is visible to this module.
  applyTokens(tokens);

  return tokens.accessToken;
}

/**
 * Signs in and takes ownership of the tab's session.
 *
 * The previous identity's cache is dropped before the new token is stored, so
 * an in-flight request from the previous session can neither be replayed with the
 * new token nor land in the cache the new identity is about to read.
 */
export async function login(
  credentials: LoginCredentials,
): Promise<LoginResult> {
  ensureAuthInterceptors();

  const response = await authApi.login(credentials);

  startIdentity();
  applyTokens(response);
  useAuthStore.getState().setAuthenticatedUser(response.user);

  return { user: response.user };
}

/**
 * Takes ownership of the tab's session with a newly issued token pair and authenticated user.
 * Used by passwordless authentication flows (verify & complete profile).
 */
export function establishAuthenticatedSession(data: {
  user: User;
  tokens: AuthTokens;
}): void {
  ensureAuthInterceptors();
  startIdentity();
  applyTokens(data.tokens);
  useAuthStore.getState().setAuthenticatedUser(data.user);
}

/**
 * Registers an account.
 *
 * Two outcomes, and only one of them is a session: when the backend requires
 * email confirmation it creates the account without issuing tokens, and this
 * function returns `verification-required` while leaving the auth state exactly as
 * it was. Treating that as a sign-in would show a signed-in shell to someone who
 * cannot make a single authenticated request.
 */
export async function register(input: RegisterInput): Promise<RegisterResult> {
  ensureAuthInterceptors();

  const response = await authApi.register(input);

  if (response.status === 'verification-required') {
    return {
      status: 'verification-required',
      user: response.user,
      message: response.message,
    };
  }

  startIdentity();
  applyTokens(response.tokens);
  useAuthStore.getState().setAuthenticatedUser(response.user);

  return { status: 'authenticated', user: response.user };
}

/**
 * Signs out.
 *
 * The backend call is best effort and the local session is cleared either way: a
 * browser that stays authenticated because a network call failed is the worse
 * outcome by a wide margin, and the abandoned server session expires on its own.
 */
export async function logout(): Promise<void> {
  const hasAccessToken = getAccessToken() !== null;

  try {
    // The authenticated UI always has an in-memory access token. Without one,
    // the protected endpoint cannot be reached, but local state still ends.
    if (hasAccessToken) {
      await authApi.logout();
    }
  } catch {
    // Intentionally ignored — see above.
  } finally {
    endSession();
  }
}

/**
 * Changes the password and ends the local session.
 *
 * Verified backend behaviour: `AuthService.changePassword` increments the user's
 * token version and deactivates every session row, so all issued credentials are
 * dead the moment it succeeds. Clearing immediately is honest — the
 * alternative is a UI that looks signed in until the next request 401s. Callers
 * should send the user to sign in again.
 */
export async function changePassword(
  input: ChangePasswordInput,
): Promise<AuthMessageResult> {
  const result = await authApi.changePassword(input);

  endSession();

  return result;
}

/**
 * Opens a new identity: invalidates anything the previous one left behind before
 * the caller stores the new access token.
 */
function startIdentity(): void {
  sessionEpoch += 1;
  clearAccessToken();
  resetIdentityCache();
}

/** Stores only the short-lived access token; refresh rotation is cookie-only. */
function applyTokens(tokens: AuthTokens): void {
  setAccessToken(tokens.accessToken);
  setSessionHint();
}

/**
 * Ends the local session: access token and hint gone, state anonymous, cached
 * data dropped. The backend clears its HttpOnly cookie during explicit logout;
 * an invalid or expired cookie cannot authenticate another request.
 *
 * Idempotent, and quiet when there was nothing to end: a 401 for a visitor who was
 * never signed in must not keep clearing a cache full of public data.
 */
function endSession(): void {
  const hadSession =
    useAuthStore.getState().status !== 'anonymous' || getAccessToken() !== null;

  sessionEpoch += 1;
  clearAccessToken();
  clearSessionHint();
  useAuthStore.getState().setAnonymous();

  if (hadSession) resetIdentityCache();
}

/**
 * Drops every cached query and mutation on an identity change.
 *
 * `resetQueryCache` cancels in-flight fetches before clearing, so a response that
 * arrives late cannot repopulate the cache with the previous identity's data.
 * Skipped on the server, where each render already gets its own query client.
 */
function resetIdentityCache(): void {
  if (typeof window === 'undefined') return;

  resetQueryCache(getQueryClient());
}
