import type { Metadata } from 'next';

import { VerifyEmailStatus } from '@/components/auth/verify-email-status';

export const metadata: Metadata = {
  title: 'Verify Email | SANAD',
  robots: { index: false, follow: false },
};

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
