'use client';

import { useAuth } from '@/hooks/use-auth';

import { AuthGate, type AuthGateProps } from './auth-gate';

export type RequireAuthProps = AuthGateProps;

/**
 * Renders its children only for a signed-in visitor.
 *
 * Generic on purpose: no route is assumed, so `redirectTo` is the caller's
 * decision. Phase 8 supplies the sign-in path once it exists.
 *
 * ```tsx
 * <RequireAuth fallback={<Skeleton />} preserveNext redirectTo="/login">
 *   <AccountArea />
 * </RequireAuth>
 * ```
 */
export function RequireAuth(props: RequireAuthProps) {
  const { isAuthenticated, isInitializing } = useAuth();

  return (
    <AuthGate {...props} allowed={isAuthenticated} pending={isInitializing} />
  );
}
