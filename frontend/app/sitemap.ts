import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/env/public-env';

const publicRoutes = [
  '/',
  '/packages',
  '/faq',
  '/feedback',
  '/pages/about-us',
  '/pages/privacy-policy',
  '/pages/terms-and-conditions',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return publicRoutes.map((path) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/packages' ? 0.9 : 0.6,
  }));
}
