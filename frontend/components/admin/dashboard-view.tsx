'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AdminPageHeader, AdminTable, DataState } from './admin-ui';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { adminApi, adminKeys } from '@/lib/api';
import {
  formatDate,
  formatMoney,
  formatStatus,
  statusIntent,
} from '@/lib/orders/presentation';

export function DashboardView() {
  const query = useQuery({
    queryKey: adminKeys.dashboard,
    queryFn: ({ signal }) => adminApi.dashboard({ signal }),
  });
  const data = query.data;
  const cards = data
    ? [
        ['Total Orders', data.overview.orders.total],
        ['New Orders', data.overview.orders.pending],
        ['In Progress', data.overview.orders.in_progress],
        ['Completed', data.overview.orders.completed],
        [
          'Revenue',
          formatMoney(
            data.overview.revenue.total,
            data.overview.revenue.currency,
          ),
        ],
        ['Customers', data.overview.customers.total],
      ]
    : [];
  return (
    <>
      <AdminPageHeader
        title="Overview"
        description="A current operational snapshot based on SANAD orders, payments, and customers."
      />
      <DataState loading={query.isPending} error={query.error?.userMessage}>
        {data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map(([label, value]) => (
                <article
                  className="border border-border bg-surface p-5 shadow-xs"
                  key={label}
                >
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {label}
                  </p>
                  <p className="mt-3 font-display text-3xl text-primary">
                    {value}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-8 flex items-end justify-between gap-4">
              <div>
                <h3 className="type-h3 text-primary">Recent Orders</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest purchases across all services.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/admin/orders">View all</Link>
              </Button>
            </div>
            <AdminTable>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase text-secondary">
                  <tr>
                    <th className="px-5 py-4">Order</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Service</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recent_orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-5 py-4">
                        <Link
                          className="font-semibold text-primary hover:underline"
                          href={`/admin/orders/${order.id}`}
                        >
                          #{order.order_number}
                        </Link>
                      </td>
                      <td className="px-5 py-4">{order.customer_name}</td>
                      <td className="px-5 py-4">
                        {order.package?.name_en ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        {formatMoney(order.final_amount)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge intent={statusIntent(order.status)}>
                          {formatStatus(order.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTable>
          </>
        ) : null}
      </DataState>
    </>
  );
}
