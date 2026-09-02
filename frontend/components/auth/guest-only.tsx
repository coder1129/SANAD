'use client';

import { useAuth } from '@/hooks/use-auth';

import { AuthGate, type AuthGateProps } from './auth-gate';

/**
 * `preserveNext` is omitted: an already signed-in visitor is being sent away from
 * a sign-in page, so there is nothing to return them to.
 */
export type GuestOnlyProps = Omit<AuthGateProps, 'preserveNext'>;

/**
 * Renders its children only for a visitor who is *not* signed in.
 *
 * For the sign-in, registration and password-reset pages, which have nothing to
 * offer someone who already has a session.
 *
 * ```tsx
 * <GuestOnly fallback={<Skeleton />} redirectTo="/">
 *   <LoginForm />
 * </GuestOnly>
 * ```
 */
export function GuestOnly(props: GuestOnlyProps) {
  const { isAnonymous, isInitializing } = useAuth();

  return <AuthGate {...props} allowed={isAnonymous} pending={isInitializing} />;
}
