import { validatePublicEnvironment } from './public-env-schema';

/**
 * Validation for the public (browser-exposed) frontend configuration.
 *
 * Only `NEXT_PUBLIC_*` variables belong here — private variables are not
 * available in the browser and must never be surfaced through this module.
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time only for literal
 * member accesses, which is why each variable is read explicitly instead of
 * through a loop over `process.env`.
 */
let cachedEnvironment:
  | {
      apiBaseUrl: string;
      checkoutMode: 'manual' | 'gateway';
      mediaBaseUrl: string;
      siteUrl: string;
    }
  | undefined;

function getPublicEnvironment() {
  if (cachedEnvironment) return cachedEnvironment;

  const parsed = validatePublicEnvironment(
    {
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      NEXT_PUBLIC_CHECKOUT_MODE: process.env.NEXT_PUBLIC_CHECKOUT_MODE,
      NEXT_PUBLIC_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    },
    { requireAll: true },
  );

  cachedEnvironment = {
    apiBaseUrl: parsed.apiBaseUrl!,
    checkoutMode: parsed.checkoutMode!,
    mediaBaseUrl: parsed.mediaBaseUrl!,
    siteUrl: parsed.siteUrl!,
  };

  return cachedEnvironment;
}

/**
 * Backend API base URL including its version prefix, for example
 * `https://backend.example.com/api/v1`.
 *
 * Validated on first use rather than at import time, and throws when the
 * variable is missing or malformed so a misconfigured deployment fails loudly
 * instead of silently issuing requests against a relative URL.
 */
export function getApiBaseUrl(): string {
  return getPublicEnvironment().apiBaseUrl;
}

export function getSiteUrl(): string {
  return getPublicEnvironment().siteUrl;
}

export function getMediaBaseUrl(): string {
  return getPublicEnvironment().mediaBaseUrl;
}

export function getCheckoutMode(): 'manual' | 'gateway' {
  return getPublicEnvironment().checkoutMode;
}
