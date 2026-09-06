'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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
export function PaymentsView() {
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
    queryKey: adminKeys.list('payments', params),
    queryFn: ({ signal }) => adminApi.payments(params, { signal }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <AdminPageHeader
        title="Payments"
        description="Read-only visibility into payment transactions and the orders they belong to."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <Input
          aria-label="Search payments"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Transaction, order or customer"
          value={search}
        />
        <select
          aria-label="Payment status"
          className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          value={status}
        >
          <option value="">All statuses</option>
          {['paid', 'pending', 'failed', 'refunded'].map((value) => (
            <option key={value} value={value}>
              {formatStatus(value)}
            </option>
          ))}
        </select>
      </div>
      <DataState
        loading={query.isPending}
        error={query.error?.userMessage}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-4 font-mono text-xs">
                    {p.transaction_id}
                  </td>
                  <td className="px-4 py-4 font-semibold text-primary">
                    #{p.order.order_number}
                  </td>
                  <td className="px-4 py-4">
                    <p>{p.order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.order.customer_email}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {formatMoney(p.amount, p.currency ?? 'AED')}
                  </td>
                  <td className="px-4 py-4">
                    {formatStatus(p.payment_method)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge intent={statusIntent(p.status)}>
                      {formatStatus(p.status)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDate(p.payment_date ?? p.created_at)}
                  </td>
                </tr>
              ))}
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
