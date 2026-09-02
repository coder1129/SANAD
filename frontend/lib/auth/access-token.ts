/**
 * In-memory access token holder.
 *
 * The access token lives in a module variable and nowhere else: not
 * `localStorage`, not `sessionStorage`, not a cookie, not a persisted store. It
 * is therefore unreadable by injected scripts that only reach for browser
 * storage, and it disappears on a full page load — which is by design. The
 * refresh token (see `./refresh-token`) is what restores the session, and the
 * bootstrap in the auth engine is what performs that restore.
 *
 * Framework-agnostic on purpose: the Axios request interceptor, the session
 * engine, and any future non-React consumer read the same holder without going
 * through React state.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Stores the token for subsequent requests.
 *
 * A no-op during server rendering: module state on the server is shared by every
 * concurrent request, so one visitor's token could be attached to another
 * visitor's request. Tokens exist only in the browser.
 */
export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;

  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
