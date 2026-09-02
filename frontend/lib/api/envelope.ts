import { ApiError, apiErrorFromResponse } from './errors';

interface SuccessfulEnvelope {
  success: true;
  data: unknown;
  message: string | null;
}

/**
 * Turns a SANAD transport envelope into the payload callers actually asked for.
 *
 * Kept free of Axios types so the same contract can back a server-side `fetch`
 * path later without duplicating the response rules.
 *
 * - `data` is returned as-is, whether it is an object, an array, a paginated
 *   `{ items, meta }` object, or `null`.
 * - An empty body (204, or 200 with no content) resolves to `null`.
 * - A 2xx body that is not an envelope is a contract violation and throws,
 *   rather than being handed to the caller as the wrong type.
 */
export function unwrapEnvelope(
  body: null | undefined | '',
  status: number,
  headers?: unknown,
): null;
export function unwrapEnvelope<T>(
  body: unknown,
  status: number,
  headers?: unknown,
): T;
export function unwrapEnvelope(
  body: unknown,
  status: number,
  headers?: unknown,
): unknown {
  if (body === undefined || body === null || body === '') {
    return null;
  }

  // A failure body remains a failure even if an upstream service incorrectly
  // delivered it with a 2xx status. Error parsing deliberately tolerates
  // optional/malformed detail fields so it can still produce a safe ApiError.
  if (isRecord(body) && body.success === false) {
    throw apiErrorFromResponse({ status, body, headers });
  }

  if (!isSuccessfulEnvelope(body)) {
    throw new ApiError({
      kind: 'unknown',
      message: `API response did not match the expected envelope (status ${status})`,
      status,
    });
  }

  return body.data;
}

function isSuccessfulEnvelope(body: unknown): body is SuccessfulEnvelope {
  return (
    isRecord(body) &&
    body.success === true &&
    hasOwn(body, 'data') &&
    body.data !== undefined &&
    hasOwn(body, 'message') &&
    (body.message === null || typeof body.message === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}
