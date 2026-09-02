import { AxiosError, isAxiosError } from 'axios';

import type { ApiErrorDetails, ApiErrorKind, ApiErrorMeta } from '@/types/api';

const FALLBACK_USER_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Safe, non-technical text per failure category. Used whenever the backend
 * message must not be shown (5xx, transport failures, malformed bodies).
 */
const USER_MESSAGES: Record<ApiErrorKind, string> = {
  network: 'Cannot reach the server. Check your connection and try again.',
  timeout: 'The request took too long. Please try again.',
  canceled: 'The request was cancelled.',
  validation: 'Please check the submitted information and try again.',
  unauthorized: 'Your session is no longer valid. Please sign in again.',
  forbidden: 'You do not have permission to perform this action.',
  'not-found': 'The requested item could not be found.',
  conflict: 'This action conflicts with existing data.',
  'rate-limited': 'Too many requests. Please wait a moment and try again.',
  client: FALLBACK_USER_MESSAGE,
  server: FALLBACK_USER_MESSAGE,
  unknown: FALLBACK_USER_MESSAGE,
};

interface ApiErrorInit {
  kind: ApiErrorKind;
  message: string;
  userMessage?: string;
  status?: number;
  code?: string;
  details?: ApiErrorDetails;
  meta?: ApiErrorMeta;
  cause?: unknown;
}

/**
 * The application's single error contract for API failures. Raw `AxiosError`
 * instances never escape the transport layer.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** Safe to render. Never carries 5xx or stack detail. */
  readonly userMessage: string;
  /** HTTP status; absent for network, timeout, and cancellation failures. */
  readonly status?: number;
  /** Backend error code, e.g. `VALIDATION_ERROR`, `TOO_MANY_REQUESTS`. */
  readonly code?: string;
  /**
   * Backend validation/detail payload, preserved as `unknown`. Consumers must
   * narrow it before use; no form field mapping is invented in this layer.
   */
  readonly details?: ApiErrorDetails;
  readonly meta: ApiErrorMeta;

  constructor(init: ApiErrorInit) {
    super(init.message, { cause: init.cause });
    this.name = 'ApiError';
    this.kind = init.kind;
    this.userMessage = init.userMessage ?? USER_MESSAGES[init.kind];
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.meta = init.meta ?? {};
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Converts anything thrown by the transport into an `ApiError`. */
export function normalizeApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (isAxiosError<unknown>(error)) return fromAxiosError(error);

  return new ApiError({
    kind: 'unknown',
    message: describeUnknownError(error),
    cause: error,
  });
}

interface ApiErrorResponseInit {
  status: number;
  body: unknown;
  headers?: unknown;
  cause?: unknown;
}

/**
 * Builds an `ApiError` from a response the backend actually produced.
 *
 * Transport-agnostic on purpose: the Axios error path, the envelope unwrapper,
 * and any future server-side `fetch` path all share this mapping.
 */
export function apiErrorFromResponse({
  status,
  body,
  headers,
  cause,
}: ApiErrorResponseInit): ApiError {
  const backendMessage = readMessage(body);
  const code = readCode(body);
  const details = readDetails(body);
  const kind = resolveKind(status, code, details);

  return new ApiError({
    kind,
    message: backendMessage ?? `API request failed with status ${status}`,
    // Backend text remains available as the technical `message`, but is never
    // promoted to UI-safe text merely because it arrived with a 4xx status.
    userMessage: USER_MESSAGES[kind],
    status,
    code,
    details,
    meta: readMeta(headers),
    cause,
  });
}

function fromAxiosError(error: AxiosError<unknown>): ApiError {
  if (error.code === AxiosError.ERR_CANCELED) {
    return new ApiError({
      kind: 'canceled',
      message: 'Request was cancelled',
      cause: error,
    });
  }

  if (
    error.code === AxiosError.ETIMEDOUT ||
    error.code === AxiosError.ECONNABORTED
  ) {
    return new ApiError({
      kind: 'timeout',
      message: 'Request timed out',
      cause: error,
    });
  }

  // No response means the request never completed: offline, DNS failure,
  // connection reset, or a blocked cross-origin request.
  if (!error.response) {
    return new ApiError({
      kind: 'network',
      message: 'Request did not reach the API',
      cause: error,
    });
  }

  return apiErrorFromResponse({
    status: error.response.status,
    body: error.response.data,
    headers: error.response.headers,
    cause: error,
  });
}

function resolveKind(
  status: number,
  code: string | undefined,
  details: ApiErrorDetails | undefined,
): ApiErrorKind {
  if (status >= 500) return 'server';

  switch (status) {
    case 400:
      // The backend reports class-validator failures as 400 + VALIDATION_ERROR
      // with the messages under `errors`, not as 422.
      return code === 'VALIDATION_ERROR' || details !== undefined
        ? 'validation'
        : 'client';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not-found';
    case 409:
      return 'conflict';
    case 422:
      return 'validation';
    case 429:
      return 'rate-limited';
    default:
      return status >= 400 ? 'client' : 'unknown';
  }
}

function readMessage(body: unknown): string | undefined {
  const raw = readProperty(body, 'message');
  if (typeof raw === 'string') return raw.trim() || undefined;

  return readStringArray(raw)?.join(' ');
}

function readCode(body: unknown): string | undefined {
  const raw = readProperty(body, 'code');
  return typeof raw === 'string' && raw !== '' ? raw : undefined;
}

function readDetails(body: unknown): ApiErrorDetails | undefined {
  const raw = readProperty(body, 'errors');
  return raw === undefined || raw === null ? undefined : raw;
}

function readMeta(headers: unknown): ApiErrorMeta {
  const meta: ApiErrorMeta = {};

  const retryAfterSeconds = parseRetryAfter(readHeader(headers, 'retry-after'));
  if (retryAfterSeconds !== undefined) {
    meta.retryAfterSeconds = retryAfterSeconds;
  }

  const requestId = readHeader(headers, 'x-request-id');
  if (requestId) meta.requestId = requestId;

  return meta;
}

/** `Retry-After` is either delay-seconds or an HTTP date; both become seconds. */
function parseRetryAfter(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return undefined;

  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

function readHeader(headers: unknown, name: string): string | undefined {
  if (!isRecord(headers)) return undefined;

  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() !== name) continue;

    const value = headers[key];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);

    const first = readStringArray(value)?.[0];
    return first;
  }

  return undefined;
}

function readProperty(source: unknown, key: string): unknown {
  return isRecord(source) ? source[key] : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const items = (value as unknown[]).filter(isString);
  return items.length > 0 ? items : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function describeUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;

  try {
    return String(error);
  } catch {
    return 'An unknown value was thrown';
  }
}
