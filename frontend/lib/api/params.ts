import type { ApiQueryParams, ApiQueryPrimitive } from '@/types/api';

/**
 * Serializes query parameters into a query string.
 *
 * Installed as the Axios instance's `paramsSerializer`, so every request gets
 * the same treatment:
 * - `undefined` and `null` are omitted entirely. The backend
 *   validation pipe runs with `forbidNonWhitelisted`, and `?search=undefined`
 *   would be sent as the literal string, so dropping them is required rather
 *   than cosmetic.
 * - Empty strings remain empty strings; whether they are meaningful is an
 *   endpoint-level concern rather than a generic transport policy.
 * - Arrays repeat the key (`tags=a&tags=b`), which is what Express's query
 *   parser turns back into an array.
 * - Numbers and booleans are stringified.
 */
export function serializeQueryParams(params: ApiQueryParams): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const values = Array.isArray(value) ? value : [value];

    for (const entry of values) {
      const serialized = serializeValue(entry);
      if (serialized !== null) search.append(key, serialized);
    }
  }

  return search.toString();
}

function serializeValue(
  value: ApiQueryPrimitive | null | undefined,
): string | null {
  if (value === undefined || value === null) return null;

  return typeof value === 'string' ? value : String(value);
}
