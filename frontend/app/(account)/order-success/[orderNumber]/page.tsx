import type { Metadata } from 'next';
import { OrderDetail } from '@/components/account/order-detail';
export const metadata: Metadata = { title: 'Order Confirmed | SANAD' };
export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  return <OrderDetail orderNumber={orderNumber} success />;
}
