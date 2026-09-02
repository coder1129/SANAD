/**
 * Failure categories the API core distinguishes. Callers branch on `kind`
 * instead of inspecting HTTP status codes or Axios internals.
 */
export type ApiErrorKind =
  /** Request never reached the backend (offline, DNS, CORS, connection reset). */
  | 'network'
  | 'timeout'
  /** Aborted through an `AbortSignal`. */
  | 'canceled'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limited'
  /** Other 4xx. */
  | 'client'
  /** 5xx. */
  | 'server'
  /** Non-conforming response body, or a throw that was not an Axios error. */
  | 'unknown';

/**
 * Backend-supplied validation/detail payload, preserved without inventing a
 * field mapping. `unknown` forces consumers to narrow it before use or display.
 */
export type ApiErrorDetails = unknown;

export interface ApiErrorMeta {
  /** `Retry-After` converted to seconds, when the backend sent one. */
  retryAfterSeconds?: number;
  /** `X-Request-Id` echoed by the backend, for log correlation. */
  requestId?: string;
}
