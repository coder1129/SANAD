import { notFound } from 'next/navigation';
import { OrderDetailView } from '@/components/admin/order-detail-view';
export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) notFound();
  return <OrderDetailView id={parsed} />;
}
