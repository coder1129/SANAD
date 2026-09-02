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
 * - No `withCredentials`. The backend authenticates with a bearer token in the
 *   `Authorization` header and takes the refresh token in the request body, so
 *   no cookies cross the origin boundary.
 * - No interceptors yet. Authentication (token attachment and refresh) attaches
 *   here in Phase 7 without changes to callers.
 */
export const apiClient = axios.create({
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
  },
  paramsSerializer: serializeQueryParams,
});
