import { getLocalizedMetadata } from '@/lib/i18n/metadata';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrderDetail } from '@/components/account/order-detail';
import { getCopy } from '@/lib/i18n/server-copy';

export async function generateMetadata(): Promise<Metadata> {
  const _copy = await getCopy();
  return await getLocalizedMetadata({
    title: _copy('Order Details | SANAD', 'تفاصيل الطلب | سند'),
  });
}

export default async function MyOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) notFound();
  return <OrderDetail id={parsed} />;
}
