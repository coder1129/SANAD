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
} from '@/types/domain';

import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from './access-token';
import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from './refresh-token';

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
 * completed must not write its rotated token pair afterwards: the pair belongs to
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
 * The access token is gone after a reload by design, so the refresh token is the
 * only thing that can prove who this tab is:
 *
 * - no refresh token → `anonymous`, no requests issued;
 * - refresh token → refresh (which rotates the pair), load `GET /auth/me`, and
 *   settle on `authenticated` with a backend-confirmed user;
 * - anything else → the session is ended and the state settles on `anonymous`.
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

  if (getRefreshToken() === null) {
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

    endSession({ discardTokens: true });
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
  const refreshToken = getRefreshToken();

  if (refreshToken === null) {
    endSession({ discardTokens: true });

    throw new ApiError({
      kind: 'unauthorized',
      message: 'No refresh token is available for this session',
    });
  }

  let tokens: AuthTokens;
  try {
    tokens = await authApi.refresh(refreshToken);
  } catch (error) {
    // A failed refresh cannot establish a usable session. Clear both tokens for
    // every failure kind so an offline/server error cannot leave the browser
    // holding a refresh credential after auth state and identity cache reset.
    endSession({ discardTokens: true });

    throw error;
  }

  if (epoch !== sessionEpoch) {
    throw new ApiError({
      kind: 'unauthorized',
      message: 'The session changed while it was being refreshed',
    });
  }

  // Rotation is atomic from the application's point of view: both halves are
  // replaced together, with no await in between, so no reader can observe a new
  // access token beside the consumed refresh token.
  applyTokens(tokens);

  return tokens.accessToken;
}

/**
 * Signs in and takes ownership of the tab's session.
 *
 * The previous identity's cache is dropped before the new tokens are stored, so
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
  const refreshToken = getRefreshToken();
  const hasAccessToken = getAccessToken() !== null;

  try {
    // Without an access token the request could only be answered with a 401, and
    // `authMode: 'bearer'` means it would not be retried after a refresh either.
    if (hasAccessToken) {
      await authApi.logout(refreshToken ?? undefined);
    }
  } catch {
    // Intentionally ignored — see above.
  } finally {
    endSession({ discardTokens: true });
  }
}

/**
 * Changes the password and ends the local session.
 *
 * Verified backend behaviour: `AuthService.changePassword` increments the user's
 * token version and deactivates every session row, so both of this tab's tokens
 * are dead the moment it succeeds. Clearing immediately is honest — the
 * alternative is a UI that looks signed in until the next request 401s. Callers
 * should send the user to sign in again.
 */
export async function changePassword(
  input: ChangePasswordInput,
): Promise<AuthMessageResult> {
  const result = await authApi.changePassword(input);

  endSession({ discardTokens: true });

  return result;
}

/**
 * Opens a new identity: invalidates anything the previous one left behind before
 * the caller stores the new tokens.
 */
function startIdentity(): void {
  sessionEpoch += 1;
  clearAccessToken();
  clearRefreshToken();
  resetIdentityCache();
}

/** Replaces both tokens together. */
function applyTokens(tokens: AuthTokens): void {
  setAccessToken(tokens.accessToken);
  setRefreshToken(tokens.refreshToken);
}

/**
 * Ends the local session: tokens gone, state anonymous, cached data dropped.
 *
 * `discardTokens` controls removal of the refresh credential. Every Phase 7
 * failure and sign-out transition passes `true`, so no failed session leaves a
 * refresh token behind. The access token always goes.
 *
 * Idempotent, and quiet when there was nothing to end: a 401 for a visitor who was
 * never signed in must not keep clearing a cache full of public data.
 */
function endSession({ discardTokens }: { discardTokens: boolean }): void {
  const hadSession =
    useAuthStore.getState().status !== 'anonymous' ||
    getAccessToken() !== null ||
    getRefreshToken() !== null;

  sessionEpoch += 1;
  clearAccessToken();
  if (discardTokens) clearRefreshToken();
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
