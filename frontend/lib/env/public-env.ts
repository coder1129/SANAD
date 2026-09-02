import { z } from 'zod';

/**
 * Validation for the public (browser-exposed) frontend configuration.
 *
 * Only `NEXT_PUBLIC_*` variables belong here — private variables are not
 * available in the browser and must never be surfaced through this module.
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time only for literal
 * member accesses, which is why each variable is read explicitly instead of
 * through a loop over `process.env`.
 */
const apiBaseUrlSchema = z
  .url({ protocol: /^https?$/ })
  // A trailing slash would produce `//` once endpoint paths are appended.
  .transform((value) => value.replace(/\/+$/, ''));

let cachedApiBaseUrl: string | undefined;

/**
 * Backend API base URL including its version prefix, for example
 * `https://backend.example.com/api/v1`.
 *
 * Validated on first use rather than at import time, and throws when the
 * variable is missing or malformed so a misconfigured deployment fails loudly
 * instead of silently issuing requests against a relative URL.
 */
export function getApiBaseUrl(): string {
  if (cachedApiBaseUrl !== undefined) return cachedApiBaseUrl;

  const result = apiBaseUrlSchema.safeParse(
    process.env.NEXT_PUBLIC_API_BASE_URL,
  );

  if (!result.success) {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL is missing or is not a valid http(s) URL. ' +
        'Set it to the backend API base including the version prefix, ' +
        'for example https://backend.example.com/api/v1.',
    );
  }

  cachedApiBaseUrl = result.data;
  return cachedApiBaseUrl;
}
