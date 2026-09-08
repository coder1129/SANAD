'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { adminApi, adminKeys } from '@/lib/api';
import { statusIntent, whatsappHref } from '@/lib/orders/presentation';
import { AdminPageHeader, ConfirmDialog, DataState } from './admin-ui';

const transitions: Record<string, string[]> = {
  pending: ['pending_payment', 'paid', 'cancelled'],
  pending_payment: ['paid', 'cancelled'],
  paid: ['received', 'in_progress', 'refunded'],
  awaiting_information: ['received', 'in_progress', 'cancelled', 'refunded'],
  received: ['awaiting_information', 'in_progress', 'cancelled', 'refunded'],
  in_progress: [
    'awaiting_information',
    'under_review',
    'ready',
    'cancelled',
    'refunded',
  ],
  under_review: ['in_progress', 'ready', 'refunded'],
  ready: ['in_progress', 'completed', 'refunded'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
};
export function OrderDetailView({ id }: { id: number }) {
  const _copy = useCopy();

  const queryClient = useQueryClient();
  const [nextStatus, setNextStatus] = useState('');
  const [confirming, setConfirming] = useState(false);
  const query = useQuery({
    queryKey: adminKeys.detail('orders', id),
    queryFn: ({ signal }) => adminApi.orders.get(id, { signal }),
  });
  const mutation = useMutation({
    mutationFn: (status: string) => adminApi.orders.updateStatus(id, status),
    onSuccess: (order) => {
      queryClient.setQueryData(adminKeys.detail('orders', id), order);
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'orders', 'list'],
      });
      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
      setConfirming(false);
      setNextStatus('');
    },
  });
  const order = query.data;
  const customerPhone = order?.user?.phone ?? order?.customer_phone;
  const wa = order
    ? whatsappHref(
        customerPhone,
        `Hello ${order.customer_name},\n\nThis is SANAD regarding your order #${order.order_number}.`,
      )
    : null;
  return (
    <>
      <AdminPageHeader
        title={_copy(order ? `Order #${order.order_number}` : 'Order Details')}
        description={_copy(
          'Complete purchase, customer, payment, and fulfilment information.',
        )}
        action={
          <Button asChild variant="outline">
            <Link href="/admin/orders">{_copy('Back to Orders')}</Link>
          </Button>
        }
      />
      <DataState
        loading={query.isPending}
        error={_copy(query.error?.userMessage)}
      >
        {order ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="grid gap-6">
              <section className="border border-border bg-surface p-6">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {_copy('Package')}
                    </p>
                    <h2 className="type-h3 mt-2 text-primary">
                      {_copy(
                        order.package?.name_en ?? 'Unassigned service',
                        order.package?.name_ar,
                      )}
                    </h2>
                  </div>
                  <StatusBadge intent={statusIntent(order.status)}>
                    {_copy(_copy.status(order.status))}
                  </StatusBadge>
                </div>
                <dl className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">
                      {_copy('Created')}
                    </dt>
                    <dd className="mt-1 font-medium">
                      {_copy(_copy.date(order.created_at))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">
                      {_copy('Customer')}
                    </dt>
                    <dd className="mt-1 font-medium">{order.customer_name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">
                      {_copy('Email')}
                    </dt>
                    <dd className="mt-1 break-all font-medium">
                      {order.customer_email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">
                      {_copy('Phone')}
                    </dt>
                    <dd className="mt-1 font-medium">
                      {_copy(order.customer_phone || '—')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-muted-foreground">
                      {_copy('Coupon')}
                    </dt>
                    <dd className="mt-1 font-medium">
                      {_copy(order.coupon_code ?? '—')}
                    </dd>
                  </div>
                </dl>
                {wa ? (
                  <Button asChild className="mt-6" variant="outline">
                    <a href={wa} target="_blank" rel="noreferrer noopener">
                      <MessageCircle className="size-4" />
                      {_copy('Open WhatsApp')}
                    </a>
                  </Button>
                ) : null}
              </section>
              <section className="border border-border bg-surface p-6">
                <h2 className="type-h4 text-primary">
                  {_copy('Payment Information')}
                </h2>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      {_copy('Original price')}
                    </dt>
                    <dd>{_copy(_copy.money(order.original_amount))}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      {_copy('Discount')}
                    </dt>
                    <dd>{_copy(_copy.money(order.discount_amount ?? 0))}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3 font-semibold">
                    <dt>{_copy('Final amount')}</dt>
                    <dd>{_copy(_copy.money(order.final_amount))}</dd>
                  </div>
                </dl>
                <div className="mt-6 grid gap-3">
                  {order.payments.map((payment) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm"
                      key={payment.id}
                    >
                      <div>
                        <p className="font-semibold">
                          {_copy(
                            payment.transaction_id ?? `Payment #${payment.id}`,
                          )}
                        </p>
                        <p className="text-muted-foreground">
                          {_copy(_copy.status(payment.payment_method))}
                        </p>
                      </div>
                      <StatusBadge intent={statusIntent(payment.status)}>
                        {_copy(_copy.status(payment.status))}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              </section>
              {order.order_status_history?.length ? (
                <section className="border border-border bg-surface p-6">
                  <h2 className="type-h4 text-primary">
                    {_copy('Status History')}
                  </h2>
                  <ol className="mt-5 grid gap-4">
                    {order.order_status_history.map((item) => (
                      <li
                        className="border-s-2 border-accent ps-4"
                        key={item.id}
                      >
                        <p className="font-semibold">
                          {_copy(_copy.status(item.to_status))}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {_copy(_copy.date(item.created_at))}
                          {_copy(item.note ? ` · ${item.note}` : '')}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}
            </div>
            <aside className="h-fit border border-border bg-surface p-6">
              <h2 className="type-h4 text-primary">{_copy('Update Status')}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {_copy('Only valid next states are available.')}
              </p>
              <label className="mt-5 grid gap-2 text-sm font-semibold">
                {_copy('Next status')}
                <select
                  className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
                  onChange={(event) => setNextStatus(event.target.value)}
                  value={nextStatus}
                >
                  <option value="">{_copy('Select status')}</option>
                  {(transitions[order.status] ?? []).map((status) => (
                    <option key={status} value={status}>
                      {_copy(_copy.status(status))}
                    </option>
                  ))}
                </select>
              </label>
              {mutation.error ? (
                <Alert
                  className="mt-4"
                  title={_copy('Update failed')}
                  description={_copy(mutation.error.userMessage)}
                  variant="error"
                />
              ) : null}
              <Button
                className="mt-5 w-full"
                disabled={!nextStatus}
                onClick={() => setConfirming(true)}
              >
                {_copy('Update Order')}
              </Button>
            </aside>
          </div>
        ) : null}
      </DataState>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={_copy('Update order status?')}
        description={_copy(
          `Move this order to ${nextStatus ? _copy.status(nextStatus) : 'the selected status'}? This change is recorded in the activity log.`,
        )}
        confirmLabel="Update status"
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate(nextStatus)}
        destructive={['cancelled', 'refunded'].includes(nextStatus)}
      />
    </>
  );
}
