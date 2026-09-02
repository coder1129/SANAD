'use client';

import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { getQueryClient } from '@/lib/query';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * TanStack Query provider wrapping the application.
 *
 * The only `'use client'` boundary required for Phase 6. The root layout and
 * every route below remain Server Components until something (an interaction, a
 * hook, or a feature-specific need) requires `'use client'`.
 *
 * The QueryClient is stable across renders: `getQueryClient()` returns one
 * module-level browser instance and a fresh server instance per request, so the
 * cache never bleeds across server requests and never resets on client re-render.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
