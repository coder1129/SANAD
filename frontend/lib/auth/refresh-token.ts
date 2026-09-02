/**
 * Refresh token storage.
 *
 * `sessionStorage` is a compatibility decision, not a preference. The current
 * backend contract takes the refresh token in the request body of
 * `POST /auth/refresh` (`RefreshTokenDto`) and never sets a cookie, so the value
 * has to be readable by JavaScript. `sessionStorage` narrows the exposure
 * compared with `localStorage`: it is scoped to one tab and cleared when that tab
 * closes, so a shared machine does not keep a usable session around.
 *
 * A `Secure; HttpOnly; SameSite` refresh cookie issued by the backend remains the
 * correct long-term design and is a future backend improvement. When that lands,
 * this module is the only place that has to change.
 *
 * Multi-tab note: `sessionStorage` is per tab and its `storage` event does not
 * propagate the way `localStorage`'s does, so there is deliberately no cross-tab
 * session synchronization here.
 */
const REFRESH_TOKEN_STORAGE_KEY = 'sanad.auth.refresh-token';

/**
 * The tab's session storage, or `null` when it cannot be used.
 *
 * Guards two cases: server rendering, where no storage exists, and hardened
 * privacy modes, where merely touching `sessionStorage` throws.
 */
function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  const storage = getSessionStorage();
  if (storage === null) return null;

  try {
    const token = storage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    return token === null || token === '' ? null : token;
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string): void {
  const storage = getSessionStorage();
  if (storage === null) return;

  try {
    storage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage quota or a privacy restriction. The session then lives only as
    // long as the in-memory access token, which is a degraded but safe outcome.
  }
}

export function clearRefreshToken(): void {
  const storage = getSessionStorage();
  if (storage === null) return;

  try {
    storage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // Nothing further to do: the value is unreachable either way.
  }
}
