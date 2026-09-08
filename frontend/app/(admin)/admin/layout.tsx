import { getLocalizedMetadata } from '@/lib/i18n/metadata';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminShell } from '@/components/admin/admin-shell';

import { getCopy } from '@/lib/i18n/server-copy';

export async function generateMetadata(): Promise<Metadata> {
  const _copy = await getCopy();
  return await getLocalizedMetadata({
    title: _copy('Admin Dashboard | SANAD', 'لوحة تحكم الإدارة | سند'),
    robots: { index: false, follow: false },
  });
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
