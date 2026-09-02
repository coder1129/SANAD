// Deliberately narrower than the `@/lib/api` barrel: the retry predicate needs
// the error contract, not the transport. Importing the barrel would construct
// the Axios instance — and so validate NEXT_PUBLIC_API_BASE_URL — while the root
// layout's provider chain is still being evaluated, turning a missing variable
// into a build-time failure on pages that issue no requests at all.
import { isApiError } from '@/lib/api/errors';
import type { ApiErrorKind } from '@/types/api';

/**
 * Bounded retry budget per failure category, keyed by `ApiError.kind`.
 *
 * Only categories that a retry can plausibly fix appear here; every other kind
 * resolves to zero retries. Deterministic client and business failures
 * (400/401/403/404/409/422) are never retried — the same request would produce
 * the same response, so retrying only delays the error state.
 *
 * `rate-limited` (429) is deliberately absent: retrying a throttled request is
 * what caused the throttle. Features that genuinely want to wait out a 429 opt
 * in per query, where {@link apiRetryDelay} already honours `Retry-After`.
 *
 * `timeout` gets a smaller budget than `network` and `server` because the
 * transport already waited out the client timeout (30s) before failing, so each
 * additional attempt is expensive in wall-clock time.
 */
const MAX_RETRIES_BY_KIND: Partial<Record<ApiErrorKind, number>> = {
  network: 2,
  timeout: 1,
  server: 2,
};

const BASE_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 15_000;

/**
 * `retry` predicate for the QueryClient defaults.
 *
 * `failureCount` is TanStack's count of failures that already happened, so it
 * is 0 when deciding on the first retry.
 *
 * Anything that is not an `ApiError` reached the cache without passing through
 * the API core — a bug in a `queryFn` rather than a transport failure — and is
 * not retried.
 */
export function shouldRetryApiError(
  failureCount: number,
  error: unknown,
): boolean {
  if (!isApiError(error)) return false;

  return failureCount < (MAX_RETRIES_BY_KIND[error.kind] ?? 0);
}

/**
 * Exponential backoff (0.5s, 1s, 2s, …) bounded at 15s.
 *
 * A normalized `Retry-After` raises the delay when the backend asked for a
 * longer wait — 503 responses commonly carry one — but never lowers it below
 * the backoff, and is capped like every other delay so a hostile or mistaken
 * header cannot park a query for minutes.
 */
export function apiRetryDelay(failureCount: number, error: unknown): number {
  const backoffMs = BASE_RETRY_DELAY_MS * 2 ** failureCount;
  const retryAfterSeconds = isApiError(error)
    ? error.meta.retryAfterSeconds
    : undefined;
  const requestedMs =
    retryAfterSeconds === undefined ? backoffMs : retryAfterSeconds * 1000;

  return Math.min(Math.max(requestedMs, backoffMs), MAX_RETRY_DELAY_MS);
}
