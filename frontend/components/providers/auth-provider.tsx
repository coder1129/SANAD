'use client';

import { useEffect, type ReactNode } from 'react';

import { bootstrapAuthSession, ensureAuthInterceptors } from '@/lib/auth';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Owns the auth lifecycle for the application.
 *
 * Renders no UI and holds no context of its own: the session lives in the auth
 * store, which any client component can read through `useAuth()`. That keeps this
 * boundary as thin as possible — it exists to run two things at the right moment.
 *
 * 1. Interceptor installation, during render. Effects run child-first, so a child
 *    that fetches on mount would otherwise issue its first request before the
 *    Authorization header existed. The call is idempotent.
 * 2. Session restoration, in an effect. Deliberately not during render: the server
 *    and the client's first paint both have to produce the `initializing` state
 *    for hydration to match, and reading `sessionStorage` is only possible after
 *    mount. The engine caches the promise, so React's double-invoked effects in
 *    development still perform a single restore.
 *
 * Children render immediately rather than waiting for the session — protected UI
 * distinguishes `initializing` from `anonymous` through the route guards, so
 * nothing has to be blocked here.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  ensureAuthInterceptors();

  useEffect(() => {
    void bootstrapAuthSession();
  }, []);

  return <>{children}</>;
}
