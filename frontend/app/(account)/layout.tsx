import { getLocalizedMetadata } from '@/lib/i18n/metadata';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { AccountGuard } from '@/components/account/account-guard';

const pageMetadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <PublicLayout>
      <AccountGuard>{children}</AccountGuard>
    </PublicLayout>
  );
}

export async function generateMetadata() {
  return getLocalizedMetadata(pageMetadata);
}
