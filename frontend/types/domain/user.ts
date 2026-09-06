/**
 * Roles the backend recognizes, mirroring `UserRole` in
 * `backend/src/common/enums`. The `users.role` column is a plain `varchar`, so
 * this union is the frontend's narrowing of it rather than a schema guarantee —
 * see the role parsing in the auth API module.
 */
export const USER_ROLES = ['customer', 'admin', 'super_admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * The authenticated identity as the application consumes it.
 *
 * The backend serializes users in snake_case with nullable booleans and
 * timestamps (`AuthService.sanitizeUser`). That payload is translated once, in
 * the auth API module, so no feature has to handle `email_verified: null`.
 *
 * Timestamps stay ISO-8601 strings — exactly what the backend sends — instead of
 * `Date` instances, so the object remains serializable and comparable.
 */
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  emailVerified: boolean;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
