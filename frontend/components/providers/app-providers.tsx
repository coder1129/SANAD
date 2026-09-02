import type { ReactNode } from 'react';

import { AuthProvider } from './auth-provider';
import { QueryProvider } from './query-provider';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Root provider composition for the SANAD frontend.
 *
 * Deliberately a Server Component: the provider tree itself carries no client
 * state and does not render on every navigation. Only the individual providers
 * that require client behavior (QueryProvider via QueryClientProvider,
 * AuthProvider for the session lifecycle) are marked `'use client'`.
 *
 * Order matters. AuthProvider sits inside QueryProvider because ending a session
 * resets the query cache, so the query client has to exist first.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
