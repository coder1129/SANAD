import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PaymentPagePreview } from '@/components/checkout/payment-page-preview';
import { getLocalizedMetadata } from '@/lib/i18n/metadata';
import { getCheckoutMode } from '@/lib/env/public-env';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function previewAmount(value: string | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= 9_999_999.99
    ? amount
    : 719.1;
}

function previewLabel(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 80) : fallback;
}

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata({
    title: 'Secure Payment Preview | SANAD',
    description: 'Preview the SANAD hosted payment experience.',
    robots: { index: false, follow: false },
  });
}

export default async function PaymentPreviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (getCheckoutMode() === 'manual') notFound();

  const query = await searchParams;

  return (
    <PaymentPagePreview
      amount={previewAmount(firstValue(query.amount))}
      orderId={previewLabel(firstValue(query.orderId), 'SANAD-DEMO')}
      transactionId={previewLabel(firstValue(query.txn), 'preview-session')}
    />
  );
}
