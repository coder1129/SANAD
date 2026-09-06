import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Merriweather } from 'next/font/google';

import { AppProviders } from '@/components/providers/app-providers';
import { getSiteUrl } from '@/lib/env/public-env';

import './globals.css';

const merriweather = Merriweather({
  subsets: ['latin'],
  variable: '--font-merriweather',
  display: 'swap',
  weight: ['400', '700', '900'],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: 'SANAD',
  title: 'SANAD | Professional Career Services',
  description:
    'Professional CV, LinkedIn, and career-document services for the UAE and Gulf job market.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'SANAD',
    title: 'SANAD | Professional Career Services',
    description:
      'Professional CV, LinkedIn, and career-document services for the UAE and Gulf job market.',
    url: '/',
  },
  twitter: {
    card: 'summary',
    title: 'SANAD | Professional Career Services',
    description:
      'Professional CV, LinkedIn, and career-document services for the UAE and Gulf job market.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={`${merriweather.variable} font-vars`}
      dir="ltr"
      lang="en"
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
