/**
 * Safe handling of redirect targets such as `?next=/orders/123`.
 *
 * Anything that ends up in `router.replace()` has to be treated as attacker
 * controlled: a crafted link like `/login?next=https://evil.example` turns the
 * application's own login flow into a redirector that lends it credibility. Only
 * paths inside this origin survive; everything else collapses to the fallback.
 */

/**
 * Base used to resolve candidate paths. Its only job is to make the WHATWG URL
 * parser available for relative input — the `.invalid` TLD can never resolve, so
 * a value that escapes to this origin is still harmless if it ever leaked out.
 */
const PLACEHOLDER_ORIGIN = 'http://redirect.invalid';

export const DEFAULT_REDIRECT_PATH = '/';

/**
 * Rejects anything that is not a path within this origin.
 *
 * Blocked: absolute URLs (`https://evil.example`), protocol-relative URLs
 * (`//evil.example`), the backslash variant browsers normalize to it
 * (`/\evil.example`), scheme-carrying values (`javascript:`, `data:`), and
 * whitespace or control characters, which are what smuggle a scheme past naive
 * `startsWith('/')` checks.
 *
 * Accepted values are normalized, so the caller gets `path + query + hash`.
 */
export function sanitizeRedirectPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT_PATH,
): string {
  if (typeof value !== 'string' || value === '') return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (containsUnsafeCharacter(value)) return fallback;

  let decodedValue: string;
  try {
    decodedValue = decodeURIComponent(value);
  } catch {
    // Invalid percent escapes and malformed UTF-8 are not valid redirect paths.
    return fallback;
  }

  if (
    decodedValue.startsWith('//') ||
    decodedValue.startsWith('/\\') ||
    containsControlCharacter(decodedValue)
  ) {
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return fallback;
  }

  // The parser resolves the tricks the string checks above cannot see, so the
  // origin is the authoritative test rather than a second opinion.
  if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Adds `?next=<path>` to an internal target, so a guard can send someone to a
 * sign-in route that knows where to return them. Both sides are sanitized: the
 * target because a redirect is only ever internal, and `next` because it is the
 * value that came in from the URL.
 */
export function withNextParam(target: string, next: string): string {
  const safeTarget = sanitizeRedirectPath(target);
  const safeNext = sanitizeRedirectPath(next);
  const url = new URL(safeTarget, PLACEHOLDER_ORIGIN);

  url.searchParams.set('next', safeNext);

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * The current location as a relative path, for round-tripping through a sign-in
 * flow. Returns the default path during server rendering, where there is no
 * location to read.
 */
export function currentRelativeLocation(): string {
  if (typeof window === 'undefined') return DEFAULT_REDIRECT_PATH;

  const { hash, pathname, search } = window.location;

  return sanitizeRedirectPath(`${pathname}${search}${hash}`);
}

/**
 * True for space, every C0 control character, and DEL. Written as a scan rather
 * than a regular expression so the control characters do not have to appear as
 * escapes inside a pattern.
 */
function containsUnsafeCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x20 || code === 0x7f) return true;
  }

  return false;
}

/** Encoded C0 controls and DEL are unsafe after percent-decoding too. */
function containsControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }

  return false;
}
