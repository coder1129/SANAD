'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { orderKeys, ordersApi, settingsApi, settingsKeys } from '@/lib/api';
import {
  formatDate,
  formatMoney,
  formatStatus,
  statusIntent,
  whatsappHref,
} from '@/lib/orders/presentation';
import { ReviewForm } from './review-form';

type Props =
  | { id: number; orderNumber?: never; success?: false }
  | { id?: never; orderNumber: string; success: true };

export function OrderDetail(props: Props) {
  const orderQuery = useQuery({
    queryKey: props.success
      ? orderKeys.number(props.orderNumber)
      : orderKeys.detail(props.id),
    queryFn: ({ signal }) =>
      props.success
        ? ordersApi.getByNumber(props.orderNumber, { signal })
        : ordersApi.getById(props.id, { signal }),
  });
  const settingsQuery = useQuery({
    queryKey: settingsKeys.public,
    queryFn: ({ signal }) => settingsApi.getPublic({ signal }),
  });
  if (orderQuery.isPending)
    return (
      <div
        className="layout-container py-16 text-sm text-muted-foreground"
        role="status"
      >
        Loading order details...
      </div>
    );
  if (orderQuery.error)
    return (
      <div className="layout-container py-16">
        <Alert
          title={
            props.success
              ? 'Order confirmation unavailable'
              : 'Order unavailable'
          }
          description={orderQuery.error.userMessage}
          variant="error"
        />
        <Button asChild className="mt-5" variant="outline">
          <Link href="/my-orders">Back to My Orders</Link>
        </Button>
      </div>
    );
  const order = orderQuery.data;
  if (!order) return null;
  const message = props.success
    ? `Hello SANAD,\n\nI'm contacting you regarding my order.\n\nOrder: #${order.orderNumber}\nService: ${order.packageName ?? 'SANAD career service'}\n\nI would like to send my documents and requirements.`
    : `Hello SANAD,\n\nI'm contacting you regarding:\n\nOrder: #${order.orderNumber}\nService: ${order.packageName ?? 'SANAD career service'}`;
  const whatsapp = whatsappHref(settingsQuery.data?.whatsapp_number, message);

  return (
    <section className="layout-container py-12 sm:py-16">
      {props.success ? (
        <div className="mb-8 border border-success/30 bg-success/5 p-6 sm:flex sm:items-start sm:gap-5">
          <CheckCircle2
            className="size-9 shrink-0 text-success"
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-success uppercase">
              Payment confirmed
            </p>
            <h1 className="type-h1 mt-2 text-primary">Order Confirmed</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Your order is safely recorded. Continue with the SANAD team on
              WhatsApp to send your documents, requirements, and career
              information.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
            Customer account
          </p>
          <h1 className="type-h1 mt-3 text-primary">
            Order #{order.orderNumber}
          </h1>
          <p className="mt-3 text-muted-foreground">
            Review the purchase and continue your service conversation.
          </p>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="border border-border bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="text-sm text-muted-foreground">Service</p>
              <h2 className="type-h3 mt-2 text-primary">
                {order.packageName ?? 'SANAD career service'}
              </h2>
            </div>
            <StatusBadge intent={statusIntent(order.status)}>
              {formatStatus(order.status)}
            </StatusBadge>
          </div>
          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground uppercase">
                Order Number
              </dt>
              <dd className="mt-1 font-semibold">#{order.orderNumber}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">
                Purchase Date
              </dt>
              <dd className="mt-1 font-semibold">
                {formatDate(order.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">
                Payment Status
              </dt>
              <dd className="mt-2">
                <StatusBadge intent={statusIntent(order.paymentStatus)}>
                  {formatStatus(order.paymentStatus)}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">
                Order Status
              </dt>
              <dd className="mt-2">
                <StatusBadge intent={statusIntent(order.status)}>
                  {formatStatus(order.status)}
                </StatusBadge>
              </dd>
            </div>
          </dl>
          <div className="mt-8 border-t border-border pt-6">
            <h2 className="font-semibold text-primary">Payment summary</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Service price</dt>
                <dd>{formatMoney(order.originalAmount, order.currency)}</dd>
              </div>
              {order.discountAmount > 0 ? (
                <div className="flex justify-between gap-4 text-success">
                  <dt>
                    Discount{order.couponCode ? ` (${order.couponCode})` : ''}
                  </dt>
                  <dd>-{formatMoney(order.discountAmount, order.currency)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(order.finalAmount, order.currency)}</dd>
              </div>
            </dl>
          </div>
        </div>
        <aside className="h-fit border border-border bg-surface-muted p-6">
          <h2 className="type-h4 text-primary">What&apos;s Next?</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Continue with the SANAD team on WhatsApp to send your documents,
            requirements, and career information.
          </p>
          {whatsapp ? (
            <Button asChild className="mt-6 w-full">
              <a href={whatsapp} rel="noreferrer noopener" target="_blank">
                <MessageCircle className="size-4" aria-hidden="true" />
                Continue on WhatsApp
              </a>
            </Button>
          ) : (
            <Alert
              className="mt-5"
              title="WhatsApp unavailable"
              description={
                settingsQuery.isPending
                  ? 'Loading contact details...'
                  : 'The WhatsApp contact has not been configured yet.'
              }
              variant="warning"
            />
          )}{' '}
          {!props.success ? (
            <Button asChild className="mt-3 w-full" variant="outline">
              <Link href="/my-orders">Back to My Orders</Link>
            </Button>
          ) : null}
        </aside>
      </div>
      {!props.success && order.status === 'completed' ? (
        <div className="mt-8 border border-border bg-surface p-6 sm:p-8">
          <ReviewForm orderId={order.id} />
        </div>
      ) : null}
    </section>
  );
}
