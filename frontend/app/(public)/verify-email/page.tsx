import { getLocalizedMetadata } from '@/lib/i18n/metadata';
import type { Metadata } from 'next';

import { VerifyEmailStatus } from '@/components/auth/verify-email-status';

import { getCopy } from '@/lib/i18n/server-copy';

export async function generateMetadata(): Promise<Metadata> {
  const _copy = await getCopy();
  return await getLocalizedMetadata({
    title: _copy('Verify Email | SANAD', 'تأكيد البريد الإلكتروني | سند'),
    robots: { index: false, follow: false },
  });
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const rawToken = (await searchParams).token;
  const token = typeof rawToken === 'string' ? rawToken : undefined;

  return (
    <main className="grid min-h-[70svh] place-items-center bg-surface-muted p-6">
      <VerifyEmailStatus token={token} />
    </main>
  );
}
