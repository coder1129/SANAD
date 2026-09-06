import { z } from 'zod';

import type {
  AuthMessageResult,
  AuthTokens,
  ChangePasswordInput,
  LoginCredentials,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  ResetPasswordInput,
  User,
  PasswordlessRequestResult,
  PasswordlessVerifyResult,
  PasswordlessCompleteProfileInput,
} from '@/types/domain';
import { USER_ROLES } from '@/types/domain';

import { ApiError } from '../errors';
import { api, type ApiRequestOptions } from '../request';

/**
 * Wire shape of a user, exactly as `AuthService.sanitizeUser` emits it: snake
 * case, with nullable booleans and timestamps.
 */
const userPayloadSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullish(),
  // `users.role` is a varchar, not a database enum. An unrecognized value falls
  // back to the least-privileged role: frontend role checks are UX guards and
  // must fail closed, while the backend guard stays the real authority.
  role: z.enum(USER_ROLES).catch('customer'),
  email_verified: z.boolean().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  gender: z.string().nullish(),
  last_login: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
});

const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
});

const loginPayloadSchema = z.object({
  user: userPayloadSchema,
  accessToken: z.string().min(1),
});

/**
 * Register answers with either a token pair or a verification notice, so both
 * halves are optional here and the branch is resolved in {@link authApi.register}.
 */
const registerPayloadSchema = z.object({
  user: userPayloadSchema,
  accessToken: z.string().min(1).optional(),
  verificationRequired: z.boolean().optional(),
  message: z.string().nullish(),
});

const messagePayloadSchema = z.object({ message: z.string().nullish() });

const passwordlessRequestSchema = z.object({
  message: z.string(),
  email: z.string(),
});

const passwordlessVerifySchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('authenticated'),
    user: userPayloadSchema,
    accessToken: z.string().min(1),
  }),
  z.object({
    status: z.literal('profile_required'),
    registrationToken: z.string().min(1),
  }),
]);

const passwordlessCompleteProfileSchema = z.object({
  status: z.literal('authenticated'),
  user: userPayloadSchema,
  accessToken: z.string().min(1),
});

type UserPayload = z.infer<typeof userPayloadSchema>;

function toUser(payload: UserPayload): User {
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    phone: payload.phone ?? null,
    role: payload.role,
    emailVerified: payload.email_verified === true,
    firstName: payload.first_name ?? null,
    lastName: payload.last_name ?? null,
    gender: payload.gender ?? null,
    lastLoginAt: payload.last_login ?? null,
    createdAt: payload.created_at ?? null,
    updatedAt: payload.updated_at ?? null,
  };
}

/**
 * Validates a payload against the contract this module was written for.
 *
 * The failure is reported as an `ApiError` so callers keep a single error type,
 * and deliberately carries neither the Zod issues nor the payload as `cause`:
 * both would embed token values in an object that error reporting may serialize.
 */
function parsePayload<T>(
  schema: z.ZodType<T>,
  payload: unknown,
  endpoint: string,
): T {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new ApiError({
      kind: 'unknown',
      message: `Unexpected response shape from ${endpoint}`,
    });
  }

  return result.data;
}

/** Confirmation-only endpoints: a missing sentence is not worth failing over. */
function readMessage(payload: unknown): AuthMessageResult {
  const result = messagePayloadSchema.safeParse(payload);

  return { message: result.success ? (result.data.message ?? null) : null };
}

/**
 * Typed operations over the `/auth` endpoints that exist in the backend
 * `AuthController`, resolved against the `api/v1` prefix already baked into the
 * API base URL.
 *
 * Transport only. Nothing here reads or writes tokens, auth state, or the router:
 * those decisions belong to the session engine in `lib/auth`, which is what makes
 * the same call reusable from a form, a guard, or a bootstrap.
 */
export const authApi = {
  /**
   * `POST /auth/login`. Rejects with 401 `INVALID_CREDENTIALS`,
   * `EMAIL_NOT_VERIFIED` or `ACCOUNT_LOCKED`, and 429 when rate limited.
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const payload = await api.post<unknown>('/auth/login', credentials, {
      authMode: 'none',
    });
    const parsed = parsePayload(
      loginPayloadSchema,
      payload,
      'POST /auth/login',
    );

    return {
      user: toUser(parsed.user),
      accessToken: parsed.accessToken,
    };
  },

  /**
   * `POST /auth/register`. Rejects with 409 `EMAIL_EXISTS`.
   *
   * A successful response does not imply an authenticated session: the outcome is
   * only `authenticated` when the backend actually issued both tokens.
   */
  async register(input: RegisterInput): Promise<RegisterResponse> {
    const payload = await api.post<unknown>('/auth/register', input, {
      authMode: 'none',
    });
    const parsed = parsePayload(
      registerPayloadSchema,
      payload,
      'POST /auth/register',
    );
    const user = toUser(parsed.user);

    if (
      parsed.verificationRequired !== true &&
      parsed.accessToken !== undefined
    ) {
      return {
        status: 'authenticated',
        user,
        tokens: {
          accessToken: parsed.accessToken,
        },
      };
    }

    return {
      status: 'verification-required',
      user,
      message: parsed.message ?? null,
    };
  },

  /**
   * `POST /auth/refresh`. The backend rotates the HttpOnly cookie and returns a
   * new browser-visible access token. Replaying a consumed cookie answers 401
   * `REFRESH_TOKEN_REUSED`.
   *
   * `authMode: 'none'` is what stops a failed refresh from triggering another
   * refresh.
   */
  async refresh(): Promise<AuthTokens> {
    const payload = await api.post<unknown>(
      '/auth/refresh',
      {},
      {
        authMode: 'none',
      },
    );

    return parsePayload(tokenPairSchema, payload, 'POST /auth/refresh');
  },

  /**
   * `POST /auth/logout`. Requires a bearer token; deactivates the session behind
   * the HttpOnly refresh cookie and increments the user's token version, which
   * invalidates outstanding access tokens too. A stale access token may refresh
   * once so the server can reliably clear and deactivate the session.
   */
  async logout(): Promise<AuthMessageResult> {
    const payload = await api.post<unknown>(
      '/auth/logout',
      {},
      {
        authMode: 'session',
      },
    );

    return readMessage(payload);
  },

  /** `GET /auth/me`. The only trusted source of the current identity. */
  async getCurrentUser(
    options?: Pick<ApiRequestOptions, 'signal'>,
  ): Promise<User> {
    const payload = await api.get<unknown>('/auth/me', options);

    return toUser(parsePayload(userPayloadSchema, payload, 'GET /auth/me'));
  },

  /** `POST /auth/verify-email` with the token from the verification link. */
  async verifyEmail(token: string): Promise<AuthMessageResult> {
    const payload = await api.post<unknown>(
      '/auth/verify-email',
      { token },
      { authMode: 'none' },
    );

    return readMessage(payload);
  },

  /**
   * `POST /auth/resend-verification`. Answers the same sentence whether or not
   * the address exists, so it cannot be used to enumerate accounts.
   */
  async resendVerification(email: string): Promise<AuthMessageResult> {
    const payload = await api.post<unknown>(
      '/auth/resend-verification',
      { email },
      { authMode: 'none' },
    );

    return readMessage(payload);
  },

  /** `POST /auth/forgot-password`. Deliberately non-committal about the address. */
  async forgotPassword(email: string): Promise<AuthMessageResult> {
    const payload = await api.post<unknown>(
      '/auth/forgot-password',
      { email },
      { authMode: 'none' },
    );

    return readMessage(payload);
  },

  /**
   * `POST /auth/reset-password`. The reset token belongs to this request only —
   * it is never stored in auth state.
   *
   * The backend increments the token version and deactivates every session for
   * the account, so any session open elsewhere is dead afterwards.
   */
  async resetPassword(input: ResetPasswordInput): Promise<AuthMessageResult> {
    const payload = await api.post<unknown>('/auth/reset-password', input, {
      authMode: 'none',
    });

    return readMessage(payload);
  },

  /**
   * `POST /auth/change-password`. Requires an authenticated session and rejects
   * with 400 `INVALID_CURRENT_PASSWORD`.
   *
   * Verified side effect: on success the backend increments the token version and
   * deactivates every session row for the user, so the caller's own tokens stop
   * working. The engine's `changePassword` ends the local session for that reason.
   */
  async changePassword(input: ChangePasswordInput): Promise<AuthMessageResult> {
    const payload = await api.post<unknown>('/auth/change-password', input);

    return readMessage(payload);
  },

  /**
   * `POST /auth/passwordless/request`. Initiates passwordless sign-in with 6-digit OTP challenge.
   */
  async requestPasswordlessOtp(
    email: string,
  ): Promise<PasswordlessRequestResult> {
    const payload = await api.post<unknown>(
      '/auth/passwordless/request',
      { email },
      { authMode: 'none' },
    );

    return parsePayload(
      passwordlessRequestSchema,
      payload,
      'POST /auth/passwordless/request',
    );
  },

  /**
   * `POST /auth/passwordless/verify`. Verifies OTP; returns either tokens or registrationToken for profile completion.
   */
  async verifyPasswordlessOtp(
    email: string,
    otp: string,
  ): Promise<PasswordlessVerifyResult> {
    const payload = await api.post<unknown>(
      '/auth/passwordless/verify',
      { email, otp },
      { authMode: 'none' },
    );

    const parsed = parsePayload(
      passwordlessVerifySchema,
      payload,
      'POST /auth/passwordless/verify',
    );

    if (parsed.status === 'authenticated') {
      return {
        status: 'authenticated',
        user: toUser(parsed.user),
        tokens: {
          accessToken: parsed.accessToken,
        },
      };
    }

    return {
      status: 'profile_required',
      registrationToken: parsed.registrationToken,
    };
  },

  /**
   * `POST /auth/passwordless/complete-profile`. Completes profile registration for verified new customer.
   */
  async completePasswordlessProfile(
    input: PasswordlessCompleteProfileInput,
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const payload = await api.post<unknown>(
      '/auth/passwordless/complete-profile',
      input,
      { authMode: 'none' },
    );

    const parsed = parsePayload(
      passwordlessCompleteProfileSchema,
      payload,
      'POST /auth/passwordless/complete-profile',
    );

    return {
      user: toUser(parsed.user),
      tokens: {
        accessToken: parsed.accessToken,
      },
    };
  },
};
