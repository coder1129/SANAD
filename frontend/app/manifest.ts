import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SANAD Professional Career Services',
    short_name: 'SANAD',
    description:
      'Professional CV, LinkedIn, and career-document services for the UAE and Gulf job market.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#183b38',
    icons: [{ src: '/icon.png', sizes: 'any', type: 'image/png' }],
  };
}
