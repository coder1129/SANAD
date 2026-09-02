import { isAxiosError, type InternalAxiosRequestConfig } from 'axios';

import { apiClient } from './client';

/**
 * Per-request authentication behavior.
 *
 * - `session` (default): attach the bearer token, and on a 401 refresh the
 *   session once and replay the request. Correct for every protected endpoint.
 * - `bearer`: attach the bearer token but never auto-refresh. Used by
 *   `POST /auth/logout`, where a refresh would resurrect the session that is
 *   being destroyed.
 * - `none`: send no token and never auto-refresh. Used by the public auth
 *   lifecycle endpoints — login, register, refresh, and the email/password
 *   flows — where a refresh attempt would be recursive or meaningless.
 */
export type ApiAuthMode = 'session' | 'bearer' | 'none';

const DEFAULT_AUTH_MODE: ApiAuthMode = 'session';

/**
 * Request-scoped auth flags.
 *
 * They are string keys rather than symbols on purpose: Axios rebuilds the config
 * from `Object.keys` when a request is issued (`mergeConfig`), so a symbol-keyed
 * flag would silently vanish on the replayed request and the retry guard would
 * stop working.
 */
interface AuthRequestConfig extends InternalAxiosRequestConfig {
  authMode?: ApiAuthMode;
  authRetryAttempted?: boolean;
}

/**
 * What the interceptors need from the session engine. Passing it in keeps this
 * module free of any dependency on the auth engine, the store, or React, and
 * keeps the transport layer the only place that knows about Axios.
 */
export interface AuthInterceptorAdapter {
  /** The in-memory access token, or `null` when there is none. */
  getAccessToken: () => string | null;
  /**
   * Single-flight session refresh. Must reject — not hang — when no refresh is
   * possible, and must issue its own request with `authMode: 'none'` so a failed
   * refresh cannot trigger another refresh.
   */
  refreshSession: () => Promise<unknown>;
}

interface InstalledInterceptors {
  request: number;
  response: number;
}

/**
 * Handles are parked on the Axios instance rather than in a module variable so a
 * hot reload that re-evaluates this module still finds — and ejects — the
 * previously installed pair instead of stacking a second one.
 */
interface InterceptorRegistry {
  __sanadAuthInterceptors?: InstalledInterceptors;
}

/**
 * Installs the Authorization and 401 interceptors on the single Axios instance.
 *
 * Idempotent: a previous installation is ejected first, so calling this during
 * render, from an effect, or twice after a hot reload can never produce duplicate
 * interceptors (which would attach two headers and, worse, run two refreshes).
 *
 * Returns an eject function for symmetry with component lifecycles.
 */
export function installAuthInterceptors(
  adapter: AuthInterceptorAdapter,
): () => void {
  ejectAuthInterceptors();

  const request = apiClient.interceptors.request.use((config) => {
    const authMode =
      (config as AuthRequestConfig).authMode ?? DEFAULT_AUTH_MODE;
    if (authMode === 'none') return config;

    const accessToken = adapter.getAccessToken();
    if (accessToken !== null) {
      config.headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return config;
  });

  const response = apiClient.interceptors.response.use(undefined, (error) =>
    handleUnauthorized(adapter, error),
  );

  (apiClient as unknown as InterceptorRegistry).__sanadAuthInterceptors = {
    request,
    response,
  };

  return ejectAuthInterceptors;
}

export function ejectAuthInterceptors(): void {
  const registry = apiClient as unknown as InterceptorRegistry;
  const installed = registry.__sanadAuthInterceptors;
  if (installed === undefined) return;

  apiClient.interceptors.request.eject(installed.request);
  apiClient.interceptors.response.eject(installed.response);
  registry.__sanadAuthInterceptors = undefined;
}

/**
 * 401 handling: refresh once, then replay the original request once.
 *
 * The replay reuses the failed request's own config, so method, body, params,
 * and `AbortSignal` are preserved, and it passes through the request interceptor
 * again — which is how it picks up the *new* access token rather than a token
 * captured here.
 */
async function handleUnauthorized(
  adapter: AuthInterceptorAdapter,
  error: unknown,
): Promise<unknown> {
  if (!isAxiosError(error) || error.response?.status !== 401) {
    throw error;
  }

  const config = error.config as AuthRequestConfig | undefined;
  const authMode = config?.authMode ?? DEFAULT_AUTH_MODE;

  // No config to replay, an endpoint that must not auto-refresh, or a request
  // that has already had its one retry: surface the 401 to the caller.
  if (
    config === undefined ||
    authMode !== 'session' ||
    config.authRetryAttempted
  ) {
    throw error;
  }

  // Marked before awaiting, so the replay carries the flag and a second 401
  // cannot start another refresh/retry cycle.
  config.authRetryAttempted = true;

  try {
    await adapter.refreshSession();
  } catch {
    // The refresh failure already ended the local session. The caller is more
    // interested in the request it made than in the refresh call, so the
    // original 401 is what propagates (normalized by the request layer).
    throw error;
  }

  return apiClient.request(config);
}
