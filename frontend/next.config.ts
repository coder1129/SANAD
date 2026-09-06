import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

import { validatePublicEnvironment } from './lib/env/public-env-schema';

const publicEnvironment = validatePublicEnvironment(
  {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  { requireAll: process.env.NODE_ENV === 'production' },
);

function toOrigin(value: string | undefined): string | undefined {
  return value ? new URL(value).origin : undefined;
}

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [];

for (const value of [
  publicEnvironment.apiBaseUrl,
  publicEnvironment.mediaBaseUrl,
  process.env.R2_PUBLIC_URL,
]) {
  if (!value) continue;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;

    remotePatterns.push({
      protocol: url.protocol.slice(0, -1) as 'http' | 'https',
      hostname: url.hostname,
      port: url.port,
      pathname: '/**',
    });
  } catch {
    // R2_PUBLIC_URL is optional; required public URLs were validated above.
  }
}

const apiOrigin = toOrigin(publicEnvironment.apiBaseUrl);
const mediaOrigin = toOrigin(publicEnvironment.mediaBaseUrl);
const sentryOrigin = toOrigin(process.env.NEXT_PUBLIC_SENTRY_DSN);
const connectSources = ["'self'", apiOrigin, sentryOrigin]
  .filter(Boolean)
  .join(' ');
const mediaSources = ["'self'", 'data:', 'blob:', apiOrigin, mediaOrigin]
  .filter(Boolean)
  .join(' ');
const isProduction = process.env.NODE_ENV === 'production';
const isSecureDeployment = publicEnvironment.siteUrl?.startsWith('https://');

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src ${mediaSources}`,
  `media-src ${mediaSources}`,
  `connect-src ${connectSources}${isProduction ? '' : ' ws: wss:'}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  ...(isSecureDeployment ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  ...(isSecureDeployment
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { remotePatterns },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/sign-in',
        permanent: false,
      },
      {
        source: '/register',
        destination: '/sign-in',
        permanent: false,
      },
    ];
  },
};

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryBuildConfigured = Boolean(
  sentryAuthToken && sentryOrg && sentryProject,
);

export default sentryBuildConfigured
  ? withSentryConfig(nextConfig, {
      authToken: sentryAuthToken,
      org: sentryOrg,
      project: sentryProject,
      silent: !process.env.CI,
      telemetry: false,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      webpack: { treeshake: { removeDebugLogging: true } },
    })
  : nextConfig;
