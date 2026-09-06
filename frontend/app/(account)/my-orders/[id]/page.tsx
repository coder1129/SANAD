import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrderDetail } from '@/components/account/order-detail';
export const metadata: Metadata = { title: 'Order Details | SANAD' };
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
