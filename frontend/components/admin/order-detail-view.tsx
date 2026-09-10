'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { adminApi, adminKeys } from '@/lib/api';
import { statusIntent, whatsappHref } from '@/lib/orders/presentation';
import { AdminPageHeader, ConfirmDialog, DataState } from './admin-ui';

const transitions: Record<string, string[]> = {
  pending: ['pending_payment', 'cancelled'],
  pending_payment: ['cancelled'],
  paid: ['received', 'in_progress', 'completed', 'refunded'],
  awaiting_information: [
    'received',
    'in_progress',
    'completed',
    'cancelled',
    'refunded',
  ],
  received: [
    'awaiting_information',
    'in_progress',
    'completed',
    'cancelled',
    'refunded',
  ],
  in_progress: [
    'awaiting_information',
    'under_review',
    'ready',
    'completed',
    'cancelled',
    'refunded',
  ],
  under_review: ['in_progress', 'ready', 'completed', 'refunded'],
  ready: ['in_progress', 'completed', 'refunded'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
};

const requirementLabels = [
  ['target_job_title', 'Target job title', 'المسمى الوظيفي المستهدف'],
  ['target_industry', 'Target industry', 'المجال المستهدف'],
  ['target_country', 'Target country', 'الدولة المستهدفة'],
  ['years_of_experience', 'Years of experience', 'سنوات الخبرة'],
  ['education', 'Education', 'التعليم والمؤهلات'],
  ['key_skills', 'Key skills', 'المهارات الأساسية'],
  ['career_goals', 'Career goals', 'الأهداف المهنية'],
  ['linkedin_url', 'LinkedIn profile', 'رابط لينكدإن'],
  ['portfolio_url', 'Portfolio', 'معرض الأعمال'],
  ['target_company', 'Target company', 'الشركة المستهدفة'],
  ['job_posting_url', 'Job posting', 'رابط إعلان الوظيفة'],
  ['first_cv', 'First CV', 'أول سيرة ذاتية'],
] as const;
export function OrderDetailView({ id }: { id: number }) {
  const _copy = useCopy();

  const queryClient = useQueryClient();
  const [nextStatus, setNextStatus] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentAmountOverride, setPaymentAmount] = useState<string | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<
    'payment_link' | 'qr_code' | 'bank_transfer' | 'cash' | 'other'
  >('payment_link');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
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
  const secondaryDiscountAmount = Number(order?.secondary_discount_amount ?? 0);
  const otherDiscountAmount = Math.max(
    0,
    Number(order?.discount_amount ?? 0) - secondaryDiscountAmount,
  );
  const paymentAmount =
    paymentAmountOverride ??
    (order ? Number(order.final_amount).toFixed(2) : '');
  const hasCollectedPayment = Boolean(
    order?.payments.some(
      (payment) =>
        ['paid', 'success'].includes(payment.status) &&
        Number(payment.amount) > 0,
    ),
  );
  const canConfirmPayment = Boolean(
    order &&
    ['pending', 'pending_payment'].includes(order.status) &&
    !hasCollectedPayment,
  );
  const canCompleteOrder = Boolean(
    order &&
    hasCollectedPayment &&
    [
      'paid',
      'awaiting_information',
      'received',
      'in_progress',
      'under_review',
      'ready',
    ].includes(order.status),
  );
  const requirementEntries = requirementLabels.flatMap(
    ([key, label, labelAr]) => {
      const value = order?.requirements?.[key];
      if (value === undefined || value === null || value === '') return [];
      return [{ key, label, labelAr, value }];
    },
  );
  const parsedPaymentAmount = Number(paymentAmount);
  const paymentMutation = useMutation({
    mutationFn: () =>
      adminApi.orders.confirmManualPayment(id, {
        amount: parsedPaymentAmount,
        paymentMethod,
        transactionReference: paymentReference.trim() || undefined,
        paymentDate: paymentDate
          ? new Date(paymentDate).toISOString()
          : undefined,
        note: paymentNote.trim() || undefined,
      }),
    onSuccess: () => {
      setConfirmingPayment(false);
      setPaymentReference('');
      setPaymentNote('');
      void queryClient.invalidateQueries({
        queryKey: adminKeys.detail('orders', id),
      });
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'orders', 'list'],
      });
      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'payments', 'list'],
      });
    },
  });
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
                    {order.secondary_package ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {_copy('Second service:', 'الخدمة الثانية:')}{' '}
                        <strong className="text-foreground">
                          {_copy(
                            order.secondary_package.name_en,
                            order.secondary_package.name_ar,
                          )}
                        </strong>
                      </p>
                    ) : null}
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
              {requirementEntries.length > 0 || order.notes ? (
                <section className="border border-border bg-surface p-6">
                  <h2 className="type-h4 text-primary">
                    {_copy('Customer requirements', 'متطلبات العميل')}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {_copy(
                      'Information supplied with this service order.',
                      'البيانات التي أرسلها العميل مع طلب الخدمة.',
                    )}
                  </p>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    {requirementEntries.map((item) => (
                      <div key={item.key}>
                        <dt className="text-xs uppercase text-muted-foreground">
                          {_copy(item.label, item.labelAr)}
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words font-medium">
                          {typeof item.value === 'boolean'
                            ? _copy(item.value ? 'Yes' : 'No')
                            : String(item.value)}
                        </dd>
                      </div>
                    ))}
                    {order.notes ? (
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase text-muted-foreground">
                          {_copy('Additional notes')}
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words font-medium">
                          {order.notes}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </section>
              ) : null}
              <section className="border border-border bg-surface p-6">
                <h2 className="type-h4 text-primary">
                  {_copy('Payment Information')}
                </h2>
                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      {_copy(
                        order.secondary_package
                          ? 'Primary service price'
                          : 'Original price',
                        order.secondary_package
                          ? 'سعر الخدمة الأساسية'
                          : 'السعر الأصلي',
                      )}
                    </dt>
                    <dd>
                      {_copy(
                        _copy.money(
                          Number(order.original_amount) -
                            Number(order.secondary_original_amount ?? 0),
                        ),
                      )}
                    </dd>
                  </div>
                  {order.secondary_package ? (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        {_copy('Second service price', 'سعر الخدمة الثانية')}
                      </dt>
                      <dd>
                        {_copy(
                          _copy.money(
                            Number(order.secondary_original_amount ?? 0),
                          ),
                        )}
                      </dd>
                    </div>
                  ) : null}
                  {secondaryDiscountAmount > 0 ? (
                    <div className="flex justify-between text-success">
                      <dt>
                        {_copy('Second service saving', 'خصم الخدمة الثانية')}
                      </dt>
                      <dd>
                        {_copy('-')}
                        {_copy(_copy.money(secondaryDiscountAmount))}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      {_copy('Discount')}
                    </dt>
                    <dd>{_copy(_copy.money(otherDiscountAmount))}</dd>
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
                          {_copy(
                            ` · ${_copy.money(Number(payment.amount), payment.currency ?? 'AED')}`,
                          )}
                        </p>
                        {payment.payment_date ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {_copy(_copy.date(payment.payment_date))}
                          </p>
                        ) : null}
                      </div>
                      <StatusBadge intent={statusIntent(payment.status)}>
                        {_copy(_copy.status(payment.status))}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
                {canConfirmPayment ? (
                  <div className="mt-7 border-t border-border pt-6">
                    <h3 className="font-semibold text-primary">
                      {_copy('Confirm payment received')}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {_copy(
                        'Use this only after the external payment appears in your payment account or bank statement. The amount must match the order total.',
                      )}
                    </p>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-semibold">
                        {_copy('Amount received')}
                        <Input
                          inputMode="decimal"
                          max="9999999.99"
                          min="0.01"
                          onChange={(event) =>
                            setPaymentAmount(event.target.value)
                          }
                          required
                          step="0.01"
                          type="number"
                          value={paymentAmount}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold">
                        {_copy('Payment method')}
                        <select
                          className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
                          onChange={(event) =>
                            setPaymentMethod(
                              event.target.value as typeof paymentMethod,
                            )
                          }
                          value={paymentMethod}
                        >
                          <option value="payment_link">
                            {_copy('Payment link')}
                          </option>
                          <option value="qr_code">{_copy('QR code')}</option>
                          <option value="bank_transfer">
                            {_copy('Bank transfer')}
                          </option>
                          <option value="cash">{_copy('Cash')}</option>
                          <option value="other">{_copy('Other')}</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-semibold">
                        {_copy('Transaction reference')}
                        <Input
                          maxLength={255}
                          onChange={(event) =>
                            setPaymentReference(event.target.value)
                          }
                          placeholder={_copy('Optional external reference')}
                          value={paymentReference}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold">
                        {_copy('Payment date')}
                        <Input
                          max={new Date().toISOString().slice(0, 16)}
                          onChange={(event) =>
                            setPaymentDate(event.target.value)
                          }
                          type="datetime-local"
                          value={paymentDate}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
                        {_copy('Reconciliation note')}
                        <Textarea
                          maxLength={2000}
                          onChange={(event) =>
                            setPaymentNote(event.target.value)
                          }
                          placeholder={_copy('Optional private note')}
                          value={paymentNote}
                        />
                      </label>
                    </div>
                    {paymentMutation.error ? (
                      <Alert
                        className="mt-4"
                        title={_copy('Payment confirmation failed')}
                        description={_copy(paymentMutation.error.userMessage)}
                        variant="error"
                      />
                    ) : null}
                    {paymentMutation.isSuccess ? (
                      <Alert
                        className="mt-4"
                        title={_copy('Payment confirmed')}
                        description={_copy(
                          'The payment, order status, dashboard revenue, and customer purchase record were updated.',
                        )}
                        variant="success"
                      />
                    ) : null}
                    <Button
                      className="mt-5"
                      disabled={
                        !Number.isFinite(parsedPaymentAmount) ||
                        parsedPaymentAmount <= 0
                      }
                      onClick={() => setConfirmingPayment(true)}
                      type="button"
                    >
                      {_copy('Confirm payment received')}
                    </Button>
                  </div>
                ) : null}
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
              {canCompleteOrder ? (
                <div className="mb-6 border-b border-border pb-6">
                  <h2 className="type-h4 text-primary">
                    {_copy('Complete and deliver order', 'إتمام وتسليم الطلب')}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {_copy(
                      'Mark the paid order completed and enable the customer review immediately.',
                      'اعتمد الطلب المدفوع كمكتمل وافتح التقييم للعميل فورًا.',
                    )}
                  </p>
                  <Button
                    className="mt-4 w-full"
                    onClick={() => {
                      setNextStatus('completed');
                      setConfirming(true);
                    }}
                  >
                    {_copy('Complete and deliver', 'إتمام وتسليم')}
                  </Button>
                </div>
              ) : null}
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
      <ConfirmDialog
        open={confirmingPayment}
        onOpenChange={setConfirmingPayment}
        title={_copy('Confirm collected payment?')}
        description={_copy(
          `Confirm that ${Number.isFinite(parsedPaymentAmount) ? _copy.money(parsedPaymentAmount) : paymentAmount} was actually received for this order. This creates a permanent payment and audit record.`,
        )}
        confirmLabel="Confirm payment"
        loading={paymentMutation.isPending}
        onConfirm={() => paymentMutation.mutate()}
      />
    </>
  );
}
