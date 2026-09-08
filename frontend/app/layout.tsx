import { getLocalizedMetadata } from '@/lib/i18n/metadata';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Cairo, Merriweather } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';

import { AppProviders } from '@/components/providers/app-providers';
import { getSiteUrl } from '@/lib/env/public-env';

import './globals.css';

const merriweather = Merriweather({
  subsets: ['latin'],
  variable: '--font-merriweather',
  display: 'swap',
  weight: ['400', '700', '900'],
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
  weight: ['400', '600', '700', '900'],
});

export async function generateMetadata(): Promise<Metadata> {
  let locale = 'en';
  try {
    locale = await getLocale();
  } catch {
    locale = 'en';
  }
  const isAr = locale === 'ar';
  const title = isAr
    ? 'سند | خدمات مهنية احترافية'
    : 'SANAD | Professional Career Services';
  const description = isAr
    ? 'خدمات احترافية لكتابة السيرة الذاتية وتحسين ملف لينكدإن والمستندات المهنية لسوق العمل في الإمارات والخليج.'
    : 'Professional CV, LinkedIn, and career-document services for the UAE and Gulf job market.';
  const appName = isAr ? 'سند' : 'SANAD';

  return await getLocalizedMetadata({
    metadataBase: new URL(getSiteUrl()),
    applicationName: appName,
    title,
    description,
    manifest: '/manifest.webmanifest',
    openGraph: {
      type: 'website',
      siteName: appName,
      title,
      description,
      url: '/',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  });
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRtl = locale === 'ar';
  const theme = (await cookies()).get('SANAD_THEME')?.value;

  return (
    <html
      className={`${merriweather.variable} ${cairo.variable} font-vars`}
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={locale}
      data-theme={theme === 'dark' ? 'dark' : 'light'}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if(!document.cookie.split(';').some(c=>c.trim().startsWith('SANAD_THEME='))&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.dataset.theme='dark'}`,
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
