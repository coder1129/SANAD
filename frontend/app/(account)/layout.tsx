import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { AccountGuard } from '@/components/account/account-guard';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <PublicLayout>
      <AccountGuard>{children}</AccountGuard>
    </PublicLayout>
  );
}
