export interface PublicEnvironment {
  apiBaseUrl?: string;
  mediaBaseUrl?: string;
  siteUrl?: string;
}

interface RawPublicEnvironment {
  NEXT_PUBLIC_API_BASE_URL?: string;
  NEXT_PUBLIC_MEDIA_BASE_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
}

const environmentKeys = [
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_MEDIA_BASE_URL',
] as const;

function parseUrl(
  key: (typeof environmentKeys)[number],
  value: string,
): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid absolute URL.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${key} must use http or https.`);
  }

  const isLocal =
    parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !isLocal) {
    throw new Error(`${key} must use https outside localhost.`);
  }

  return value.replace(/\/+$/, '');
}

export function validatePublicEnvironment(
  raw: RawPublicEnvironment,
  options: { requireAll: boolean },
): PublicEnvironment {
  const missing = options.requireAll
    ? environmentKeys.filter((key) => !raw[key]?.trim())
    : [];

  if (missing.length > 0) {
    throw new Error(
      `Missing required frontend environment variables: ${missing.join(', ')}`,
    );
  }

  return {
    apiBaseUrl: raw.NEXT_PUBLIC_API_BASE_URL?.trim()
      ? parseUrl(
          'NEXT_PUBLIC_API_BASE_URL',
          raw.NEXT_PUBLIC_API_BASE_URL.trim(),
        )
      : undefined,
    siteUrl: raw.NEXT_PUBLIC_SITE_URL?.trim()
      ? parseUrl('NEXT_PUBLIC_SITE_URL', raw.NEXT_PUBLIC_SITE_URL.trim())
      : undefined,
    mediaBaseUrl: raw.NEXT_PUBLIC_MEDIA_BASE_URL?.trim()
      ? parseUrl(
          'NEXT_PUBLIC_MEDIA_BASE_URL',
          raw.NEXT_PUBLIC_MEDIA_BASE_URL.trim(),
        )
      : undefined,
  };
}
