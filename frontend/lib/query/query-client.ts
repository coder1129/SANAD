import {
  defaultShouldDehydrateQuery,
  environmentManager,
  QueryClient,
} from '@tanstack/react-query';

import { apiRetryDelay, shouldRetryApiError } from './retry';

/**
 * Baseline freshness window. Long enough that a navigation back to a screen, a
 * remount, or a second component reading the same key does not re-request;
 * short enough that nothing feels frozen. Content that tolerates far longer
 * caching (public packages, CMS pages) and data that must stay tight (order
 * status, notifications) both override this in their own query definitions.
 */
export const DEFAULT_STALE_TIME_MS = 60_000;

/**
 * How long an unobserved query survives before it is garbage collected. Covers
 * a realistic tab-switch or detail-then-back round trip while keeping the cache
 * bounded — deliberately not `Infinity`, which would retain every list and
 * detail payload of a long admin session.
 */
export const DEFAULT_GC_TIME_MS = 5 * 60_000;

/**
 * Builds a QueryClient with the SANAD defaults.
 *
 * Exported separately from {@link getQueryClient} so a server render (or a
 * future test) can own an isolated instance.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        gcTime: DEFAULT_GC_TIME_MS,
        // A failed server render is not worth retrying: it delays the response
        // and the client will fetch anyway. This mirrors TanStack's own
        // server-side default, which an explicit `retry` would otherwise lose.
        retry: environmentManager.isServer() ? false : shouldRetryApiError,
        retryDelay: apiRetryDelay,
        // SANAD reads are not live feeds. Refetching on every tab focus
        // multiplies backend traffic for data that rarely changes underneath the
        // user; screens that need it (order status, notifications) opt in.
        refetchOnWindowFocus: false,
        // Coming back from an offline stretch is exactly when cached data is
        // most likely to be wrong, and it happens rarely enough to be cheap.
        refetchOnReconnect: true,
        // Refetch on mount only when the data is already stale, which
        // `staleTime` decides. `'always'` would defeat the cache.
        refetchOnMount: true,
        // No offline queueing or optimistic-offline behaviour: requests pause
        // while the browser reports no connection and resume on reconnect.
        networkMode: 'online',
      },
      mutations: {
        // Writes are not assumed idempotent — a retried checkout or upload can
        // duplicate work. Individual mutations that are safe to repeat opt in.
        retry: false,
        networkMode: 'online',
      },
      dehydrate: {
        // Also stream queries that are still in flight, so a future server
        // prefetch can start a request and let the client await the same one
        // instead of issuing a second. Inert until something calls `dehydrate`.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * The QueryClient for the current environment.
 *
 * On the server every render gets its own instance, so one request can never
 * observe another request's — or another user's — cache. In the browser a single
 * module-level instance is reused, which keeps the cache alive across re-renders
 * and client-side navigations instead of throwing it away on every render.
 */
export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) return createQueryClient();

  browserQueryClient ??= createQueryClient();

  return browserQueryClient;
}

/**
 * Drops the entire query and mutation cache.
 *
 * Intended for identity changes (sign-in, sign-out, token holder switch) in
 * Phase 7: cached customer and admin payloads must not survive into the next
 * session. In-flight fetches are cancelled first — a request that resolves
 * after the cache is cleared would otherwise repopulate it with the previous
 * identity's data.
 */
export function resetQueryCache(queryClient: QueryClient): void {
  void queryClient.cancelQueries();
  queryClient.clear();
}
