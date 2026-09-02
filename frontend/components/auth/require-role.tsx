'use client';

import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/types/domain';

import { AuthGate, type AuthGateProps } from './auth-gate';

export interface RequireRoleProps extends AuthGateProps {
  /** Any one of these is enough. `super_admin` satisfies every requirement. */
  roles: UserRole | readonly UserRole[];
}

/**
 * Renders its children only for a signed-in visitor holding one of the roles.
 *
 * Role inheritance follows the backend `RolesGuard`, where a super admin passes
 * every role check, so `roles={['admin']}` covers both admin roles.
 *
 * ```tsx
 * <RequireRole denied={<NotAuthorized />} roles="admin">
 *   <AdminArea />
 * </RequireRole>
 * ```
 */
export function RequireRole({ roles, ...gateProps }: RequireRoleProps) {
  const { hasRole, isAuthenticated, isInitializing } = useAuth();

  return (
    <AuthGate
      {...gateProps}
      allowed={isAuthenticated && hasRole(roles)}
      pending={isInitializing}
    />
  );
}
