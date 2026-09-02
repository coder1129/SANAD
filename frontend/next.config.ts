import type { NextConfig } from 'next';

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [];

for (const value of [
  process.env.NEXT_PUBLIC_API_BASE_URL,
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
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
    // Public environment validation reports malformed URLs at runtime.
  }
}

const nextConfig: NextConfig = {
  images: { remotePatterns },
};

export default nextConfig;
