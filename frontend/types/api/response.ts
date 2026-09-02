/**
 * Transport envelope used by every SANAD API endpoint.
 *
 * The NestJS backend wraps controller return values through a global response
 * interceptor and emits the error variant from its global exception filter.
 * Application code should not need these types: the request layer unwraps the
 * envelope and hands callers `T` directly.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  /** Include `null` in `T` for endpoints that can return no payload. */
  data: T;
  message: string | null;
}

export interface ApiErrorResponse {
  success: false;
  /**
   * Normally a string. An array only reaches the client when a handler throws
   * an `HttpException` with an array payload directly, bypassing the exception
   * filter's validation branch.
   */
  message: string | string[];
  /** Backend error code, e.g. `VALIDATION_ERROR`, `NOT_FOUND`. */
  code?: string | null;
  /**
   * Backend validation/detail payload. It is intentionally `unknown`: the
   * exception filter normally emits `{ validation: string[] }`, but pass-through
   * error envelopes are not guaranteed to use field-keyed data.
   */
  errors?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
