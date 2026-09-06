'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { orderKeys, ordersApi } from '@/lib/api/modules/orders';
import {
  formatDate,
  formatMoney,
  formatStatus,
  statusIntent,
} from '@/lib/orders/presentation';

export function OrdersList() {
  const [page, setPage] = useState(1);
  const params = { page, limit: 10 };
  const query = useQuery({
    queryKey: orderKeys.list(params),
    queryFn: ({ signal }) => ordersApi.list(params, { signal }),
    placeholderData: keepPreviousData,
  });
  if (query.isPending)
    return (
      <p className="py-12 text-sm text-muted-foreground" role="status">
        Loading your orders...
      </p>
    );
  if (query.error)
    return (
      <Alert
        title="Orders unavailable"
        description={query.error.userMessage}
        variant="error"
      />
    );
  if (!query.data || query.data.items.length === 0)
    return (
      <div className="border border-dashed border-border bg-surface p-10 text-center">
        <h2 className="type-h4 text-primary">
          You haven&apos;t placed any orders yet.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Explore SANAD services and choose the support that fits your next
          step.
        </p>
        <Button asChild className="mt-6">
          <Link href="/packages">Explore Services</Link>
        </Button>
      </div>
    );
  return (
    <div>
      <div className="hidden overflow-x-auto border border-border bg-surface md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface-muted text-xs tracking-wide text-secondary uppercase">
            <tr>
              <th className="px-5 py-4">Order</th>
              <th className="px-5 py-4">Service</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Payment</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Purchased</th>
              <th className="px-5 py-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {query.data.items.map((order) => (
              <tr key={order.id}>
                <td className="px-5 py-4 font-semibold text-primary">
                  #{order.orderNumber}
                </td>
                <td className="px-5 py-4">{order.packageName ?? 'Service'}</td>
                <td className="px-5 py-4">
                  {formatMoney(order.finalAmount, order.currency)}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge intent={statusIntent(order.paymentStatus)}>
                    {formatStatus(order.paymentStatus)}
                  </StatusBadge>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge intent={statusIntent(order.status)}>
                    {formatStatus(order.status)}
                  </StatusBadge>
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {formatDate(order.createdAt)}
                </td>
                <td className="px-5 py-4">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/my-orders/${order.id}`}>View Order</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 md:hidden">
        {query.data.items.map((order) => (
          <article
            className="border border-border bg-surface p-5"
            key={order.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Order</p>
                <h2 className="mt-1 font-semibold text-primary">
                  #{order.orderNumber}
                </h2>
              </div>
              <StatusBadge intent={statusIntent(order.status)}>
                {formatStatus(order.status)}
              </StatusBadge>
            </div>
            <p className="mt-5 font-semibold">
              {order.packageName ?? 'SANAD service'}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="mt-1">
                  {formatMoney(order.finalAmount, order.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Payment</dt>
                <dd className="mt-1">{formatStatus(order.paymentStatus)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Purchased</dt>
                <dd className="mt-1">{formatDate(order.createdAt)}</dd>
              </div>
            </dl>
            <Button asChild className="mt-5 w-full" variant="outline">
              <Link href={`/my-orders/${order.id}`}>View Order</Link>
            </Button>
          </article>
        ))}
      </div>
      {query.data.meta.totalPages > 1 ? (
        <div className="mt-7 flex items-center justify-between gap-4">
          <Button
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            variant="outline"
          >
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {page} of {query.data.meta.totalPages}
          </p>
          <Button
            disabled={page >= query.data.meta.totalPages}
            onClick={() => setPage((value) => value + 1)}
            variant="outline"
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
