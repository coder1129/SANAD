'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { adminApi, adminKeys } from '@/lib/api';
import { statusIntent } from '@/lib/orders/presentation';
import { AdminPageHeader, AdminTable, DataState, Pager } from './admin-ui';
export function PaymentsView() {
  const _copy = useCopy();

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
        title={_copy('Payments')}
        description={_copy(
          'Read-only visibility into payment transactions and the orders they belong to.',
        )}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <Input
          aria-label={_copy('Search payments')}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={_copy('Transaction, order or customer')}
          value={search}
        />
        <select
          aria-label={_copy('Payment status')}
          className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          value={status}
        >
          <option value="">{_copy('All statuses')}</option>
          {['paid', 'pending', 'failed', 'refunded'].map((value) => (
            <option key={value} value={value}>
              {_copy(_copy.status(value))}
            </option>
          ))}
        </select>
      </div>
      <DataState
        loading={query.isPending}
        error={_copy(query.error?.userMessage)}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[920px] text-start text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">{_copy('Transaction ID')}</th>
                <th className="px-4 py-3">{_copy('Order')}</th>
                <th className="px-4 py-3">{_copy('Customer')}</th>
                <th className="px-4 py-3">{_copy('Amount')}</th>
                <th className="px-4 py-3">{_copy('Method')}</th>
                <th className="px-4 py-3">{_copy('Status')}</th>
                <th className="px-4 py-3">{_copy('Date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-4 font-mono text-xs">
                    {_copy(p.transaction_id)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-primary">
                    {_copy('#')}
                    {_copy(p.order.order_number)}
                  </td>
                  <td className="px-4 py-4">
                    <p>{_copy(p.order.customer_name)}</p>
                    <p className="text-xs text-muted-foreground">
                      {_copy(p.order.customer_email)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {_copy(_copy.money(p.amount, p.currency ?? 'AED'))}
                  </td>
                  <td className="px-4 py-4">
                    {_copy(_copy.status(p.payment_method))}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge intent={statusIntent(p.status)}>
                      {_copy(_copy.status(p.status))}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {_copy(_copy.date(p.payment_date ?? p.created_at))}
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
