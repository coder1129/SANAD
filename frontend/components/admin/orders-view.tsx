'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { adminApi, adminKeys } from '@/lib/api';
import { statusIntent } from '@/lib/orders/presentation';
import {
  AdminPageHeader,
  AdminTable,
  ConfirmDialog,
  DataState,
  Pager,
} from './admin-ui';

const statusFilters = [
  { value: '', label: 'All statuses', labelAr: 'كل الحالات' },
  {
    value: 'queue:awaiting_payment',
    label: 'Awaiting payment (all)',
    labelAr: 'بانتظار الدفع (الكل)',
  },
  {
    value: 'queue:in_progress',
    label: 'In production (all)',
    labelAr: 'قيد التنفيذ (الكل)',
  },
  ...[
    'pending',
    'pending_payment',
    'paid',
    'awaiting_information',
    'received',
    'in_progress',
    'under_review',
    'ready',
    'completed',
    'cancelled',
    'refunded',
  ].map((value) => ({ value: `status:${value}`, status: value })),
];

const completableStatuses = new Set([
  'paid',
  'awaiting_information',
  'received',
  'in_progress',
  'under_review',
  'ready',
]);

function canCompleteOrder(order: {
  status: string;
  payments: Array<{ status: string; amount: number | string }>;
}) {
  return (
    completableStatuses.has(order.status) &&
    order.payments.some(
      (payment) =>
        ['paid', 'success'].includes(payment.status) &&
        Number(payment.amount) > 0,
    )
  );
}

export function OrdersView() {
  const _copy = useCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const queueParam = searchParams.get('queue');
  const statusParam = searchParams.get('status');
  const statusFilter = queueParam
    ? `queue:${queueParam}`
    : statusParam
      ? `status:${statusParam}`
      : '';

  const queue = statusFilter.startsWith('queue:')
    ? statusFilter.slice('queue:'.length)
    : undefined;
  const status = statusFilter.startsWith('status:')
    ? statusFilter.slice('status:'.length)
    : undefined;
  const params = {
    page,
    limit: 20,
    search: search || undefined,
    status,
    queue,
  };
  const query = useQuery({
    queryKey: adminKeys.list('orders', params),
    queryFn: ({ signal }) => adminApi.orders.list(params, { signal }),
    placeholderData: keepPreviousData,
  });
  const bulkCompleteMutation = useMutation({
    mutationFn: () => adminApi.orders.completeBulk(selectedOrderIds),
    onSuccess: () => {
      setConfirmingBulk(false);
      setSelectedOrderIds([]);
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'orders', 'list'],
      });
      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
    },
  });
  const completableOrders =
    query.data?.items.filter(canCompleteOrder).map((order) => order.id) ?? [];
  const allCompletableSelected =
    completableOrders.length > 0 &&
    completableOrders.every((id) => selectedOrderIds.includes(id));

  const toggleOrder = (id: number) => {
    setSelectedOrderIds((current) =>
      current.includes(id)
        ? current.filter((orderId) => orderId !== id)
        : [...current, id].slice(0, 100),
    );
  };

  const toggleAllCompletable = () => {
    setSelectedOrderIds((current) => {
      if (allCompletableSelected) {
        return current.filter((id) => !completableOrders.includes(id));
      }
      return [...new Set([...current, ...completableOrders])].slice(0, 100);
    });
  };
  return (
    <>
      <AdminPageHeader
        title={_copy('Orders')}
        description={_copy(
          'Search purchases, inspect payment state, and move work through the approved order lifecycle.',
        )}
      />
      <div className="mb-5 grid gap-3 border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          {_copy('Search')}
          <Input
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={_copy('Order, customer, email or phone')}
            value={search}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          {_copy('Status')}
          <select
            className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3 text-sm"
            onChange={(event) => {
              const nextParams = new URLSearchParams(searchParams.toString());
              nextParams.delete('queue');
              nextParams.delete('status');
              const [kind, value] = event.target.value.split(':');
              if (kind && value) nextParams.set(kind, value);
              const nextQuery = nextParams.toString();
              router.replace(nextQuery ? `?${nextQuery}` : '/admin/orders');
              setPage(1);
            }}
            value={statusFilter}
          >
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {'status' in filter
                  ? _copy.status(filter.status)
                  : _copy(filter.label, filter.labelAr)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {selectedOrderIds.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-primary">
            {_copy(
              `${selectedOrderIds.length} orders selected`,
              `تم تحديد ${selectedOrderIds.length} طلب`,
            )}
          </p>
          <Button
            loading={bulkCompleteMutation.isPending}
            loadingLabel={_copy(
              'Completing selected orders',
              'جارٍ إكمال الطلبات المحددة',
            )}
            onClick={() => setConfirmingBulk(true)}
          >
            {_copy('Complete selected', 'إكمال المحدد')}
          </Button>
        </div>
      ) : null}
      {bulkCompleteMutation.error ? (
        <Alert
          className="mb-5"
          title={_copy('Bulk completion failed', 'تعذر إكمال الطلبات')}
          description={_copy(bulkCompleteMutation.error.userMessage)}
          variant="error"
        />
      ) : null}
      {bulkCompleteMutation.isSuccess ? (
        <Alert
          className="mb-5"
          title={_copy('Orders completed', 'تم إكمال الطلبات')}
          description={_copy(
            `${bulkCompleteMutation.data.completed_count} orders were completed and their customers can now submit reviews.`,
            `تم إكمال ${bulkCompleteMutation.data.completed_count} طلب، ويمكن للعملاء الآن إضافة التقييمات.`,
          )}
          variant="success"
        />
      ) : null}
      <DataState
        loading={query.isPending}
        error={_copy(query.error?.userMessage)}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[900px] text-start text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">
                  <input
                    aria-label={_copy(
                      'Select all completable orders',
                      'تحديد كل الطلبات القابلة للإكمال',
                    )}
                    checked={allCompletableSelected}
                    disabled={completableOrders.length === 0}
                    onChange={toggleAllCompletable}
                    type="checkbox"
                  />
                </th>
                <th className="px-4 py-3">{_copy('Order')}</th>
                <th className="px-4 py-3">{_copy('Customer')}</th>
                <th className="px-4 py-3">{_copy('Package')}</th>
                <th className="px-4 py-3">{_copy('Amount')}</th>
                <th className="px-4 py-3">{_copy('Payment')}</th>
                <th className="px-4 py-3">{_copy('Order Status')}</th>
                <th className="px-4 py-3">{_copy('Date')}</th>
                <th className="px-4 py-3">{_copy('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((order) => {
                const completable = canCompleteOrder(order);
                const collectedPayment = order.payments.find(
                  (payment) =>
                    ['paid', 'success'].includes(payment.status) &&
                    Number(payment.amount) > 0,
                );
                const payment =
                  collectedPayment?.status ??
                  order.payments[0]?.status ??
                  'pending';
                return (
                  <tr key={order.id}>
                    <td className="px-4 py-4">
                      <input
                        aria-label={_copy(
                          `Select order ${order.order_number}`,
                          `تحديد الطلب ${order.order_number}`,
                        )}
                        checked={selectedOrderIds.includes(order.id)}
                        disabled={!completable}
                        onChange={() => toggleOrder(order.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-4 py-4 font-semibold text-primary">
                      {_copy('#')}
                      {_copy(order.order_number)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.customer_email}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="block">
                        {_copy(
                          order.package?.name_en ?? '—',
                          order.package?.name_ar,
                        )}
                      </span>
                      {order.secondary_package ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {_copy('+ Second:', '+ الثانية:')}{' '}
                          {_copy(
                            order.secondary_package.name_en,
                            order.secondary_package.name_ar,
                          )}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      {_copy(_copy.money(order.final_amount))}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge intent={statusIntent(payment)}>
                        {_copy(_copy.status(payment))}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge intent={statusIntent(order.status)}>
                        {_copy(_copy.status(order.status))}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {_copy(_copy.date(order.created_at))}
                    </td>
                    <td className="px-4 py-4">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/orders/${order.id}`}>
                          {_copy('View')}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTable>
      </DataState>
      <Pager
        page={page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPage={setPage}
      />
      <ConfirmDialog
        open={confirmingBulk}
        onOpenChange={setConfirmingBulk}
        title={_copy('Complete selected orders?', 'إكمال الطلبات المحددة؟')}
        description={_copy(
          `Mark ${selectedOrderIds.length} paid orders as completed? Their customers will be able to submit reviews immediately.`,
          `هل تريد تعيين ${selectedOrderIds.length} طلب مدفوع كمكتمل؟ سيتمكن العملاء من إضافة التقييم فورًا.`,
        )}
        confirmLabel={_copy('Complete selected', 'إكمال المحدد')}
        loading={bulkCompleteMutation.isPending}
        onConfirm={() => bulkCompleteMutation.mutate()}
      />
    </>
  );
}
