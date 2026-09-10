'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { adminApi, adminKeys } from '@/lib/api';
import { statusIntent } from '@/lib/orders/presentation';
import { AdminPageHeader, AdminTable, DataState, Pager } from './admin-ui';

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
export function OrdersView() {
  const _copy = useCopy();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
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
      <DataState
        loading={query.isPending}
        error={_copy(query.error?.userMessage)}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[900px] text-start text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
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
                const payment = order.payments[0]?.status ?? 'pending';
                return (
                  <tr key={order.id}>
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
                      {_copy(
                        order.package?.name_en ?? '—',
                        order.package?.name_ar,
                      )}
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
    </>
  );
}
