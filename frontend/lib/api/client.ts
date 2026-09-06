import axios from 'axios';

import { serializeQueryParams } from './params';

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * The single Axios instance used for every SANAD API call.
 *
 * Deliberately minimal:
 * - No global `Content-Type`. Axios sets `application/json` for plain objects
 *   and lets the runtime generate the `multipart/form-data` boundary for
 *   `FormData` bodies; a global value would break uploads.
 * - `withCredentials` is enabled so the browser can send the HttpOnly refresh
 *   cookie to the configured API origin. JavaScript never reads that cookie.
 * - No interceptors yet. Authentication (token attachment and refresh) attaches
 *   here in Phase 7 without changes to callers.
 */
export const apiClient = axios.create({
  timeout: DEFAULT_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
  paramsSerializer: serializeQueryParams,
});
