const SESSION_HINT_KEY = 'sanad.auth.has-session';

/**
 * Non-sensitive browser hint used only to avoid a refresh request for visitors
 * who have never signed in. The real credential remains an HttpOnly cookie and
 * the backend is always the authority.
 */
export function hasSessionHint(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSessionHint(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(SESSION_HINT_KEY, '1');
  } catch {
    // Storage can be disabled. Authentication still works for the current page.
  }
}

export function clearSessionHint(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Nothing else is required: the backend cookie is still authoritative.
  }
}
