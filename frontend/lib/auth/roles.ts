import type { User, UserRole } from '@/types/domain';

/**
 * Frontend role checks.
 *
 * These are navigation and UX guards: they decide what to render and where to
 * send someone, never whether an operation is allowed. Every protected endpoint
 * is guarded again by the backend (`JwtAuthGuard` plus `RolesGuard`), which stays
 * the only real authorization boundary — a tampered client can flip any of these
 * booleans and still be refused by the API.
 */
export function hasRole(
  user: User | null,
  roles: UserRole | readonly UserRole[],
): boolean {
  if (user === null) return false;

  // Mirrors the backend `RolesGuard`, which short-circuits every role
  // requirement for super admins. Keeping the same rule here avoids a UI that
  // hides areas the API would happily serve.
  if (user.role === 'super_admin') return true;

  return typeof roles === 'string'
    ? user.role === roles
    : roles.includes(user.role);
}

/** Admin areas: `admin` and, by inheritance, `super_admin`. */
export function isAdmin(user: User | null): boolean {
  return hasRole(user, 'admin');
}

/** Reserved for functionality that only the highest role may see. */
export function isSuperAdmin(user: User | null): boolean {
  return user?.role === 'super_admin';
}

/**
 * A plain customer, excluding staff. Customer areas themselves only require an
 * authenticated session, so prefer an authentication check over this unless the
 * distinction genuinely matters.
 */
export function isCustomer(user: User | null): boolean {
  return user?.role === 'customer';
}
