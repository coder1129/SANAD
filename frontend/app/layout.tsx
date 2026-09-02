import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DM_Serif_Display, Inter } from 'next/font/google';

import { AppProviders } from '@/components/providers/app-providers';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-dm-serif-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SANAD Frontend',
  description: 'SANAD frontend initialization.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={`${inter.variable} ${dmSerifDisplay.variable}`}
      dir="ltr"
      lang="en"
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
