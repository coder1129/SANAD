'use client';

import {
  ArrowLeft,
  Check,
  CreditCard,
  Info,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { BrandLogo } from '@/components/shared/brand-logo';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCopy } from '@/lib/i18n/use-copy';

type PreviewPaymentMethod = 'card' | 'apple_pay';

interface PaymentPagePreviewProps {
  amount: number;
  orderId: string;
  transactionId: string;
}

export function PaymentPagePreview({
  amount,
  orderId,
  transactionId,
}: PaymentPagePreviewProps) {
  const _copy = useCopy();
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] =
    useState<PreviewPaymentMethod>('card');
  const [showNotice, setShowNotice] = useState(false);

  function selectMethod(method: PreviewPaymentMethod) {
    setPaymentMethod(method);
    setShowNotice(false);
  }

  return (
    <div className="relative isolate min-h-svh overflow-hidden bg-surface-muted py-6 sm:py-14">
      <div
        aria-hidden="true"
        className="absolute -top-32 left-1/2 -z-10 size-[34rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="layout-container">
        <div className="mx-auto mb-5 flex max-w-5xl items-center justify-between gap-4">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-primary transition-colors hover:bg-surface"
            onClick={() => router.back()}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {_copy('Back to checkout', 'العودة لإتمام الطلب')}
          </button>
          <span className="rounded-full border border-warning/25 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">
            {_copy('Payment preview', 'معاينة الدفع')}
          </span>
        </div>

        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface shadow-lg lg:grid-cols-[minmax(0,1fr)_21rem]">
          <main className="p-6 sm:p-9 lg:p-11">
            <div className="flex items-center justify-between gap-5 border-b border-border pb-7">
              <BrandLogo size="sm" />
              <div className="flex items-center gap-2 text-xs font-semibold text-success">
                <LockKeyhole aria-hidden="true" className="size-4" />
                {_copy('Secure checkout', 'دفع آمن')}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
                {_copy('Choose how to pay', 'اختر طريقة الدفع')}
              </p>
              <h1 className="type-h3 mt-2 text-primary">
                {_copy('Complete your payment', 'أكمل عملية الدفع')}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                {_copy(
                  'This screen previews the hosted checkout that will open after PayTabs is connected.',
                  'هذه معاينة لصفحة الدفع المستضافة التي ستفتح بعد ربط PayTabs.',
                )}
              </p>
            </div>

            <div
              aria-label={_copy('Payment method', 'طريقة الدفع')}
              className="mt-7 grid gap-3 sm:grid-cols-2"
              role="group"
            >
              <button
                aria-pressed={paymentMethod === 'card'}
                className={`relative flex min-h-20 items-center gap-3 rounded-xl border p-4 text-start transition-colors ${paymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                onClick={() => selectMethod('card')}
                type="button"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted">
                  <CreditCard aria-hidden="true" className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {_copy('Bank card', 'بطاقة بنكية')}
                  </span>
                  <span className="mt-1 block text-xs">Visa / Mastercard</span>
                </span>
                {paymentMethod === 'card' ? (
                  <span className="absolute top-2 end-2 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check aria-hidden="true" className="size-3" />
                  </span>
                ) : null}
              </button>

              <button
                aria-pressed={paymentMethod === 'apple_pay'}
                className={`relative flex min-h-20 items-center gap-3 rounded-xl border p-4 text-start transition-colors ${paymentMethod === 'apple_pay' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                onClick={() => selectMethod('apple_pay')}
                type="button"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted">
                  <Smartphone aria-hidden="true" className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Apple Pay</span>
                  <span className="mt-1 block text-xs">
                    {_copy('Fast checkout', 'دفع سريع')}
                  </span>
                </span>
                {paymentMethod === 'apple_pay' ? (
                  <span className="absolute top-2 end-2 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check aria-hidden="true" className="size-3" />
                  </span>
                ) : null}
              </button>
            </div>

            {paymentMethod === 'card' ? (
              <div className="mt-8 grid gap-5" data-testid="card-preview">
                <div>
                  <label
                    className="type-label text-foreground"
                    htmlFor="preview-card-number"
                  >
                    {_copy('Card number', 'رقم البطاقة')}
                  </label>
                  <div className="relative mt-2">
                    <CreditCard
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      autoComplete="off"
                      className="ps-10 font-mono tracking-[0.12em]"
                      id="preview-card-number"
                      inputMode="numeric"
                      maxLength={19}
                      placeholder="4242 4242 4242 4242"
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="type-label text-foreground"
                    htmlFor="preview-card-name"
                  >
                    {_copy('Name on card', 'الاسم على البطاقة')}
                  </label>
                  <Input
                    autoComplete="off"
                    className="mt-2"
                    id="preview-card-name"
                    placeholder={_copy('CARDHOLDER NAME', 'اسم حامل البطاقة')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="type-label text-foreground"
                      htmlFor="preview-expiry"
                    >
                      {_copy('Expiry date', 'تاريخ الانتهاء')}
                    </label>
                    <Input
                      autoComplete="off"
                      className="mt-2 font-mono"
                      id="preview-expiry"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <label
                      className="type-label text-foreground"
                      htmlFor="preview-cvc"
                    >
                      CVC
                    </label>
                    <Input
                      autoComplete="off"
                      className="mt-2 font-mono"
                      id="preview-cvc"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="•••"
                      type="password"
                    />
                  </div>
                </div>
                <Button
                  className="mt-1 w-full"
                  onClick={() => setShowNotice(true)}
                  size="lg"
                >
                  <LockKeyhole aria-hidden="true" className="size-4" />
                  {_copy('Pay', 'ادفع')} {_copy(_copy.money(amount, 'AED'))}
                </Button>
              </div>
            ) : (
              <div
                className="mt-8 rounded-xl border border-border bg-surface-muted p-6 text-center sm:p-8"
                data-testid="apple-pay-preview"
              >
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Smartphone aria-hidden="true" className="size-6" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-primary">
                  Apple Pay
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {_copy(
                    'Confirm securely with Face ID, Touch ID, or your device passcode.',
                    'أكّد الدفع بأمان باستخدام Face ID أو Touch ID أو رمز دخول جهازك.',
                  )}
                </p>
                <button
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-black px-5 text-base font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
                  onClick={() => setShowNotice(true)}
                  type="button"
                >
                  Apple Pay · {_copy(_copy.money(amount, 'AED'))}
                </button>
              </div>
            )}

            {showNotice ? (
              <Alert
                className="mt-5"
                description={_copy(
                  'This is a visual preview. No card data was sent and no payment was collected.',
                  'هذه معاينة مرئية فقط. لم تُرسل بيانات البطاقة ولم يتم تحصيل أي مبلغ.',
                )}
                icon={<Info />}
                title={_copy('Preview only', 'معاينة فقط')}
                variant="warning"
              />
            ) : null}
          </main>

          <aside className="border-t border-border bg-primary p-6 text-primary-foreground sm:p-8 lg:border-t-0 lg:border-s">
            <p className="text-xs font-semibold tracking-[0.16em] text-primary-foreground/70 uppercase">
              {_copy('Order summary', 'ملخص الطلب')}
            </p>
            <h2 className="mt-3 text-xl font-semibold">
              {_copy('SANAD career service', 'خدمة سند المهنية')}
            </h2>

            <dl className="mt-8 grid gap-5 text-sm">
              <div>
                <dt className="text-primary-foreground/65">
                  {_copy('Order', 'الطلب')}
                </dt>
                <dd className="mt-1 break-all font-semibold">#{orderId}</dd>
              </div>
              <div>
                <dt className="text-primary-foreground/65">
                  {_copy('Payment reference', 'مرجع الدفع')}
                </dt>
                <dd className="mt-1 break-all font-mono text-xs">
                  {transactionId}
                </dd>
              </div>
              <div className="border-t border-primary-foreground/20 pt-5">
                <dt className="text-primary-foreground/65">
                  {_copy('Total due', 'الإجمالي المستحق')}
                </dt>
                <dd className="mt-2 text-3xl font-semibold">
                  {_copy(_copy.money(amount, 'AED'))}
                </dd>
              </div>
            </dl>

            <div className="mt-10 rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-accent"
                />
                <div>
                  <p className="text-sm font-semibold">
                    {_copy('Protected payment', 'دفع محمي')}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-primary-foreground/70">
                    {_copy(
                      'The live version will be processed on the PCI-compliant PayTabs checkout.',
                      'ستتم معالجة النسخة الفعلية عبر صفحة PayTabs المتوافقة مع معايير PCI.',
                    )}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
