'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { adminApi, adminKeys } from '@/lib/api';
import {
  formatDate,
  formatMoney,
  formatStatus,
  statusIntent,
} from '@/lib/orders/presentation';
import { AdminPageHeader, AdminTable, DataState, Pager } from './admin-ui';

const statuses = [
  '',
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
];
export function OrdersView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const params = {
    page,
    limit: 20,
    search: search || undefined,
    status: status || undefined,
  };
  const query = useQuery({
    queryKey: adminKeys.list('orders', params),
    queryFn: ({ signal }) => adminApi.orders.list(params, { signal }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="Search purchases, inspect payment state, and move work through the approved order lifecycle."
      />
      <div className="mb-5 grid gap-3 border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          Search
          <Input
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Order, customer, email or phone"
            value={search}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          Status
          <select
            className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3 text-sm"
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            value={status}
          >
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value ? formatStatus(value) : 'All statuses'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <DataState
        loading={query.isPending}
        error={query.error?.userMessage}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Order Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((order) => {
                const payment = order.payments[0]?.status ?? 'pending';
                return (
                  <tr key={order.id}>
                    <td className="px-4 py-4 font-semibold text-primary">
                      #{order.order_number}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.customer_email}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {order.package?.name_en ?? '—'}
                    </td>
                    <td className="px-4 py-4">
                      {formatMoney(order.final_amount)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge intent={statusIntent(payment)}>
                        {formatStatus(payment)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge intent={statusIntent(order.status)}>
                        {formatStatus(order.status)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/orders/${order.id}`}>View</Link>
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
