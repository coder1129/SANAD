import type { AxiosRequestConfig } from 'axios';

import type { ApiQueryParams } from '@/types/api';
import { getApiBaseUrl } from '@/lib/env/public-env';

import type { ApiAuthMode } from './auth-interceptors';
import { apiClient } from './client';
import { unwrapEnvelope } from './envelope';
import { normalizeApiError } from './errors';

export type ApiHttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Per-request options. Intentionally a narrow slice of `AxiosRequestConfig`:
 * `baseURL`, `paramsSerializer`, and response handling belong to the client and
 * must not be overridden per call.
 */
export interface ApiRequestOptions extends Pick<
  AxiosRequestConfig,
  'headers' | 'timeout'
> {
  params?: ApiQueryParams;
  /**
   * Cancellation signal. Passed straight to Axios, so it composes with
   * TanStack Query's `queryFn` signal and with effect cleanup.
   */
  signal?: AbortSignal;
  /**
   * How the auth interceptors treat this request. Defaults to `'session'`
   * (bearer token plus one refresh-and-replay on 401), which is right for every
   * protected endpoint. Only the auth lifecycle endpoints opt out.
   */
  authMode?: ApiAuthMode;
}

/**
 * Generic transport call: sends the request, unwraps the success envelope, and
 * rejects with a normalized `ApiError` for every failure mode.
 *
 * `body` may be a plain object (sent as JSON) or `FormData` (sent as multipart,
 * with the boundary set by the runtime).
 */
export async function apiRequest<T>(
  method: ApiHttpMethod,
  url: string,
  body?: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  try {
    const response = await apiClient.request<unknown>({
      // Resolve public configuration only when an actual API request is made.
      // Importing the auth/provider graph during prerender must not require a
      // backend URL when no request runs.
      baseURL: getApiBaseUrl(),
      method,
      url,
      data: body,
      ...options,
    });

    return unwrapEnvelope<T>(response.data, response.status, response.headers);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * Verb helpers over {@link apiRequest}. Domain API modules build on these;
 * React components never call them with a literal endpoint path.
 */
export const api = {
  get: <T>(url: string, options?: ApiRequestOptions): Promise<T> =>
    apiRequest<T>('get', url, undefined, options),

  post: <T>(
    url: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> => apiRequest<T>('post', url, body, options),

  put: <T>(
    url: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> => apiRequest<T>('put', url, body, options),

  patch: <T>(
    url: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> => apiRequest<T>('patch', url, body, options),

  delete: <T>(url: string, options?: ApiRequestOptions): Promise<T> =>
    apiRequest<T>('delete', url, undefined, options),
};
