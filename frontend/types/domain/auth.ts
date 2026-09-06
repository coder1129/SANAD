import type { User } from './user';

/**
 * Session lifecycle state.
 *
 * `initializing` is deliberately distinct from `anonymous`: on a full page load
 * the access token is gone (memory only) and the session is restored from the
 * refresh token asynchronously. Without the third state, protected UI would
 * flash its unauthenticated branch on every reload.
 */
export type AuthStatus = 'initializing' | 'authenticated' | 'anonymous';

/** Body of `POST /auth/login`. */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Body of `POST /auth/register`. `phone` is optional in the backend DTO. */
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

/** Body of `POST /auth/reset-password`. The token comes from the email link. */
export interface ResetPasswordInput {
  token: string;
  password: string;
}

/** Body of `POST /auth/change-password`. Requires an authenticated session. */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Browser-visible authentication result. The refresh credential is issued only
 * as an HttpOnly cookie by the backend and is deliberately absent here.
 *
 * Confined to the auth API module and the session engine: tokens never reach
 * React state, the query cache, component props, or persistent storage other
 * than the access token's in-memory slot.
 */
export interface AuthTokens {
  accessToken: string;
}

/** Payload of `POST /auth/login`, with the user already mapped to {@link User}. */
export interface LoginResponse extends AuthTokens {
  user: User;
}

/**
 * Payload of `POST /auth/register`.
 *
 * The backend answers in one of two shapes depending on its
 * `REQUIRE_EMAIL_VERIFICATION` configuration: either the account is usable
 * immediately and tokens are issued, or the account exists but sign-in is
 * blocked until the emailed token is confirmed. Modelling this as a union stops
 * a caller from reading `tokens` — or assuming an authenticated session — in the
 * verification case.
 */
export type RegisterResponse =
  | { status: 'authenticated'; user: User; tokens: AuthTokens }
  | { status: 'verification-required'; user: User; message: string | null };

/** What the engine's `login()` returns. Tokens stay inside the engine. */
export interface LoginResult {
  user: User;
}

/** What the engine's `register()` returns. Mirrors {@link RegisterResponse}. */
export type RegisterResult =
  | { status: 'authenticated'; user: User }
  | { status: 'verification-required'; user: User; message: string | null };

/**
 * Endpoints whose payload is only a confirmation sentence: logout, email
 * verification, resend verification, forgot/reset/change password.
 */
export interface AuthMessageResult {
  message: string | null;
}

/** Payload of POST /auth/passwordless/request */
export interface PasswordlessRequestResult {
  message: string;
  email: string;
}

/** Result of POST /auth/passwordless/verify */
export type PasswordlessVerifyResult =
  | { status: 'authenticated'; user: User; tokens: AuthTokens }
  | { status: 'profile_required'; registrationToken: string };

/** Payload of POST /auth/passwordless/complete-profile */
export interface PasswordlessCompleteProfileInput {
  registrationToken: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: 'male' | 'female';
}
