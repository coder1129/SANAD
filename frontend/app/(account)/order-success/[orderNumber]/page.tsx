import { getLocalizedMetadata } from '@/lib/i18n/metadata';
import type { Metadata } from 'next';
import { OrderDetail } from '@/components/account/order-detail';
import { getCopy } from '@/lib/i18n/server-copy';

export async function generateMetadata(): Promise<Metadata> {
  const _copy = await getCopy();
  return await getLocalizedMetadata({
    title: _copy('Order Confirmed | SANAD', 'تم تأكيد الطلب | سند'),
  });
}

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return <OrderDetail orderNumber={orderNumber} success />;
}
