'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  LockKeyhole,
  Phone,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { useAuthModal } from '@/components/auth/auth-modal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { checkoutApi, isApiError, ordersApi, packagesApi, paymentsApi } from '@/lib/api';
import type {
  CareerPackage,
  CheckoutPaymentMethod,
  CheckoutPricing,
  PaymentResult,
} from '@/types/domain';

interface CheckoutExperienceProps {
  packageItem: CareerPackage;
  pricing: CheckoutPricing;
}

interface CheckoutFormState {
  phone: string;
  targetJobTitle: string;
  targetIndustry: string;
  careerGoals: string;
  notes: string;
  paymentMethod: CheckoutPaymentMethod;
  couponCode: string;
}

interface FieldErrors {
  phone?: string;
  targetJobTitle?: string;
  targetIndustry?: string;
  careerGoals?: string;
  notes?: string;
}

const PAYMENT_METHODS: Array<{
  value: CheckoutPaymentMethod;
  label: string;
  detail: string;
  icon: typeof CreditCard;
}> = [
  {
    value: 'card',
    label: 'Card',
    detail: 'Visa or Mastercard',
    icon: CreditCard,
  },
  {
    value: 'apple_pay',
    label: 'Apple Pay',
    detail: 'Fast checkout',
    icon: Smartphone,
  },
];

function validateForm(form: CheckoutFormState): FieldErrors {
  const errors: FieldErrors = {};
  const phone = form.phone.trim();

  if (!phone)
    errors.phone = 'Please add a phone number for WhatsApp follow-up.';
  else if (!/^[\d\s+()\-]{5,20}$/.test(phone)) {
    errors.phone = 'Enter a valid phone number.';
  }
  if (form.targetJobTitle.length > 255) {
    errors.targetJobTitle = 'Keep this under 255 characters.';
  }
  if (form.targetIndustry.length > 255) {
    errors.targetIndustry = 'Keep this under 255 characters.';
  }
  if (form.careerGoals.length > 2000) {
    errors.careerGoals = 'Keep this under 2,000 characters.';
  }
  if (form.notes.length > 5000) {
    errors.notes = 'Keep this under 5,000 characters.';
  }

  return errors;
}

function isPaymentComplete(payment: PaymentResult): boolean {
  return (
    payment.bypassed ||
    payment.requiresPayment === false ||
    ['paid', 'completed', 'success'].includes(payment.status.toLowerCase())
  );
}

export function CheckoutExperience({
  packageItem,
  pricing,
}: CheckoutExperienceProps) {
  const _copy = useCopy();

  const pathname = usePathname();
  const router = useRouter();
  const openAuthModal = useAuthModal();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const [form, setForm] = useState<CheckoutFormState>({
    phone: user?.phone ?? '',
    targetJobTitle: '',
    targetIndustry: '',
    careerGoals: '',
    notes: '',
    paymentMethod: 'card',
    couponCode: '',
  });
  const [displayPricing, setDisplayPricing] = useState(pricing);
  const [packages, setPackages] = useState<CareerPackage[]>([]);
  const [secondaryPackageId, setSecondaryPackageId] = useState<number | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PaymentResult | null>(
    null,
  );

  function updateField<K extends keyof CheckoutFormState>(
    field: K,
    value: CheckoutFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError(null);
  }

  const companionOffer = packageItem.companionOffers?.[0];
  useEffect(() => {
    if (!companionOffer) return;
    if (companionOffer.type === 'cross_service_any') {
      void packagesApi.list().then((result) => setPackages(result.items.filter((item) => item.id !== packageItem.id)));
    }
  }, [companionOffer, packageItem.id]);

  async function refreshPricing(nextSecondaryPackageId = secondaryPackageId, couponCode = form.couponCode.trim()) {
    const nextPricing = await checkoutApi.preview({
      packageId: packageItem.id,
      offerId: pricing.offerId ?? undefined,
      ...(nextSecondaryPackageId ? { secondaryPackageId: nextSecondaryPackageId } : {}),
      ...(couponCode ? { couponCode } : {}),
    });
    setDisplayPricing(nextPricing);
  }

  async function selectSecondaryPackage(id: number) {
    setError(null);
    setSecondaryPackageId(id);
    try { await refreshPricing(id); } catch (requestError) {
      setSecondaryPackageId(null);
      setDisplayPricing(pricing);
      setError(isApiError(requestError) ? requestError.userMessage : 'We could not apply this service offer.');
    }
  }

  async function applyCoupon() {
    const couponCode = form.couponCode.trim();
    setError(null);
    setIsApplyingCoupon(true);
    try {
      await refreshPricing(secondaryPackageId, couponCode);
    } catch (requestError) {
      setDisplayPricing(pricing);
      setError(
        isApiError(requestError)
          ? requestError.userMessage
          : 'We could not apply this coupon. Please try again.',
      );
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedForm = {
      ...form,
      phone: form.phone || user?.phone || '',
    };
    const errors = validateForm(submittedForm);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setError(null);
    setPendingPayment(null);
    setIsSubmitting(true);

    try {
      const order = await ordersApi.create({
        packageId: packageItem.id,
        offerId: displayPricing.offerId ?? undefined,
        couponCode: displayPricing.couponCode ?? undefined,
        secondaryPackageId: displayPricing.secondaryPackageId ?? undefined,
        customerPhone: submittedForm.phone.trim(),
        notes: form.notes.trim() || undefined,
        requirements: {
          targetJobTitle: form.targetJobTitle.trim() || undefined,
          targetIndustry: form.targetIndustry.trim() || undefined,
          careerGoals: form.careerGoals.trim() || undefined,
        },
      });
      const payment = await paymentsApi.create({
        orderId: order.id,
        paymentMethod: form.paymentMethod,
        returnUrl:
          typeof window === 'undefined'
            ? undefined
            : `${window.location.origin}/order-success/${encodeURIComponent(order.orderNumber)}`,
      });

      if (isPaymentComplete(payment)) {
        router.replace(
          `/order-success/${encodeURIComponent(order.orderNumber)}`,
        );
      } else if (payment.paymentUrl) {
        setPendingPayment(payment);
      } else {
        setError('The payment session could not be created. Please try again.');
      }
    } catch (requestError) {
      setError(
        isApiError(requestError)
          ? requestError.userMessage
          : 'We could not start your order. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing) {
    return (
      <div className="grid min-h-80 place-items-center rounded-xl border border-border bg-surface p-8">
        <div className="text-sm text-muted-foreground" role="status">
          {_copy('Restoring your secure session...')}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-border bg-surface p-7 text-center shadow-sm sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
          <LockKeyhole aria-hidden="true" className="size-6" />
        </span>
        <h2 className="type-h3 mt-6 text-primary">
          {_copy('Sign in to continue')}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {_copy(
            'Your account keeps the order, payment, and WhatsApp handoff connected in one place.',
          )}
        </p>
        <Button
          className="mt-7 min-w-48"
          onClick={() => openAuthModal(pathname)}
          size="lg"
        >
          {_copy('Open sign in')}
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          {_copy('The sign-in form opens in a centered modal on this page.')}
        </p>
      </section>
    );
  }

  if (pendingPayment) {
    return (
      <section className="mx-auto max-w-2xl rounded-xl border border-border bg-surface p-7 shadow-sm sm:p-10">
        <span className="grid size-12 place-items-center rounded-full bg-accent/15 text-secondary">
          <CreditCard aria-hidden="true" className="size-6" />
        </span>
        <h2 className="type-h3 mt-6 text-primary">
          {_copy('Continue to secure payment')}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {_copy(
            'Your order is saved. Complete payment with our secure provider, then return here to continue to WhatsApp.',
          )}
        </p>
        <Button asChild className="mt-7" size="lg">
          <a href={pendingPayment.paymentUrl ?? '#'}>
            {_copy('Open secure payment')}
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </Button>
      </section>
    );
  }

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      onSubmit={handleSubmit}
    >
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
              {_copy('Your details')}
            </p>
            <h2 className="type-h3 mt-2 text-primary">
              {_copy('Help us prepare your order')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {_copy(
                'A few details help the service owner start with the right context.',
              )}
            </p>
          </div>
          <ShieldCheck
            aria-hidden="true"
            className="size-6 shrink-0 text-accent"
          />
        </div>

        {error ? (
          <Alert
            className="mt-6"
            description={_copy(error)}
            icon={<ShieldCheck />}
            variant="error"
          />
        ) : null}

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              className="type-label text-foreground"
              htmlFor="checkout-email"
            >
              {_copy('Account email')}
            </label>
            <Input
              className="mt-2"
              id="checkout-email"
              readOnly
              value={user.email}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {_copy('Signed in as')}
              {user.name}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label
              className="type-label text-foreground"
              htmlFor="checkout-phone"
            >
              {_copy('WhatsApp phone')}
              <span className="text-error">{_copy('*')}</span>
            </label>
            <div className="relative mt-2">
              <Phone
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-invalid={fieldErrors.phone ? true : undefined}
                className="ps-10"
                id="checkout-phone"
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder={_copy('+966 5X XXX XXXX')}
                value={form.phone || user.phone || ''}
              />
            </div>
            {fieldErrors.phone ? (
              <p className="mt-2 text-sm text-error">
                {_copy(fieldErrors.phone)}
              </p>
            ) : null}
          </div>
          <div>
            <label
              className="type-label text-foreground"
              htmlFor="checkout-job-title"
            >
              {_copy('Target job title')}
            </label>
            <Input
              aria-invalid={fieldErrors.targetJobTitle ? true : undefined}
              className="mt-2"
              id="checkout-job-title"
              onChange={(event) =>
                updateField('targetJobTitle', event.target.value)
              }
              placeholder={_copy('e.g. Product Manager')}
              value={form.targetJobTitle}
            />
            {fieldErrors.targetJobTitle ? (
              <p className="mt-2 text-sm text-error">
                {_copy(fieldErrors.targetJobTitle)}
              </p>
            ) : null}
          </div>
          <div>
            <label
              className="type-label text-foreground"
              htmlFor="checkout-industry"
            >
              {_copy('Target industry')}
            </label>
            <Input
              aria-invalid={fieldErrors.targetIndustry ? true : undefined}
              className="mt-2"
              id="checkout-industry"
              onChange={(event) =>
                updateField('targetIndustry', event.target.value)
              }
              placeholder={_copy('e.g. FinTech / SaaS')}
              value={form.targetIndustry}
            />
            {fieldErrors.targetIndustry ? (
              <p className="mt-2 text-sm text-error">
                {_copy(fieldErrors.targetIndustry)}
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label
              className="type-label text-foreground"
              htmlFor="checkout-goals"
            >
              {_copy('Career goals')}
            </label>
            <Textarea
              aria-invalid={fieldErrors.careerGoals ? true : undefined}
              className="mt-2"
              id="checkout-goals"
              onChange={(event) =>
                updateField('careerGoals', event.target.value)
              }
              placeholder={_copy(
                'What would you like this service to help you achieve?',
              )}
              value={form.careerGoals}
            />
            {fieldErrors.careerGoals ? (
              <p className="mt-2 text-sm text-error">
                {_copy(fieldErrors.careerGoals)}
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label
              className="type-label text-foreground"
              htmlFor="checkout-notes"
            >
              {_copy('Additional notes')}
            </label>
            <Textarea
              aria-invalid={fieldErrors.notes ? true : undefined}
              className="mt-2"
              id="checkout-notes"
              onChange={(event) => updateField('notes', event.target.value)}
              placeholder={_copy(
                'Anything else the service owner should know?',
              )}
              value={form.notes}
            />
            {fieldErrors.notes ? (
              <p className="mt-2 text-sm text-error">
                {_copy(fieldErrors.notes)}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <aside className="h-fit rounded-xl border border-border bg-surface shadow-sm lg:sticky lg:top-6">
        <div className="border-b border-border bg-surface-muted p-6">
          <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
            {_copy('Order summary')}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-primary">
            {_copy(packageItem.name, packageItem.nameAr)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {_copy('Delivered in')}
            {_copy(displayPricing.deliveryDays)} {_copy('days')}
          </p>
        </div>
        <div className="p-6">
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">
                {_copy('Service price')}
              </dt>
              <dd className="font-semibold text-foreground">
                {_copy(_copy.money(displayPricing.originalPrice, displayPricing.currency))}
              </dd>
            </div>
            {displayPricing.offerDiscountAmount > 0 ? (
              <div className="flex items-center justify-between gap-4 text-success">
                <dt>{_copy('Offer saving')}</dt>
                <dd className="font-semibold">
                  {_copy('-')}
                  {_copy(
                    _copy.money(displayPricing.offerDiscountAmount, displayPricing.currency),
                  )}
                </dd>
              </div>
            ) : null}
            {displayPricing.couponDiscountAmount > 0 ? (
              <div className="flex items-center justify-between gap-4 text-success">
                <dt>{_copy('Coupon discount')}</dt>
                <dd className="font-semibold">
                  {_copy('-')}
                  {_copy(
                    _copy.money(
                      displayPricing.couponDiscountAmount,
                      displayPricing.currency,
                    ),
                  )}
                </dd>
              </div>
            ) : null}
            <div className="mt-2 flex items-end justify-between gap-4 border-t border-border pt-4">
              <dt className="font-semibold text-primary">{_copy('Total')}</dt>
              <dd className="font-display text-3xl leading-none text-primary">
                {_copy(_copy.money(displayPricing.finalAmount, displayPricing.currency))}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-border pt-5">
            <label className="type-label text-foreground" htmlFor="checkout-coupon">
              {_copy('Coupon Code')}
            </label>
            <div className="mt-2 flex gap-2">
              <Input
                id="checkout-coupon"
                onChange={(event) => updateField('couponCode', event.target.value)}
                placeholder={_copy('Enter coupon code')}
                value={form.couponCode}
              />
              <Button
                loading={isApplyingCoupon}
                onClick={() => void applyCoupon()}
                type="button"
                variant="outline"
              >
                {_copy('Apply')}
              </Button>
            </div>
            {displayPricing.couponCode ? (
              <p className="mt-2 text-xs text-success">
                {_copy('Coupon applied')}: {_copy(displayPricing.couponCode)}
              </p>
            ) : null}
          </div>

          {companionOffer ? (
            <div className="mt-6 border-t border-border pt-5">
              <p className="type-label text-foreground">{_copy('Second service offer')}</p>
              {companionOffer.type === 'cross_service_specific' && companionOffer.packageId ? (
                <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm">
                  <input
                    checked={secondaryPackageId === companionOffer.packageId}
                    className="mt-1 size-4 accent-primary"
                    onChange={(event) => {
                      if (event.target.checked) void selectSecondaryPackage(companionOffer.packageId!);
                      else {
                        setSecondaryPackageId(null);
                        void refreshPricing(null).catch(() => setDisplayPricing(pricing));
                      }
                    }}
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-semibold text-foreground">
                      {_copy('Add the discounted second service')}
                    </span>
                    <span className="mt-1 block text-muted-foreground">
                      {_copy('You can continue with this service only if you prefer.')}
                    </span>
                  </span>
                </label>
              ) : (
                <label className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  {_copy('Choose your discounted second service')}
                  <select
                    className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3 text-foreground"
                    onChange={(event) => { const id = Number(event.target.value); if (id) void selectSecondaryPackage(id); }}
                    value={secondaryPackageId ?? 0}
                  >
                    <option value="0">{_copy('Select package')}</option>
                    {packages.map((item) => <option key={item.id} value={item.id}>{_copy(item.name, item.nameAr)}</option>)}
                  </select>
                </label>
              )}
              {displayPricing.secondaryPackageId ? (
                <p className="mt-2 text-xs text-success">
                  {_copy('Second service saving')}: {_copy('-')}{_copy(_copy.money(displayPricing.secondaryDiscountAmount, displayPricing.currency))}
                </p>
              ) : null}
            </div>
          ) : null}

          <fieldset className="mt-7">
            <legend className="type-label text-foreground">
              {_copy('Payment method')}
            </legend>
            <div className="mt-3 grid gap-2">
              {PAYMENT_METHODS.map(({ value, label, detail, icon: Icon }) => (
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${form.paymentMethod === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  key={value}
                >
                  <input
                    checked={form.paymentMethod === value}
                    className="sr-only"
                    name="payment-method"
                    onChange={() => updateField('paymentMethod', value)}
                    type="radio"
                    value={value}
                  />
                  <span className="grid size-9 place-items-center rounded-md bg-surface-muted text-secondary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-primary">
                      {_copy(label)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {_copy(detail)}
                    </span>
                  </span>
                  <span
                    className={`ms-auto grid size-5 place-items-center rounded-full border ${form.paymentMethod === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}
                  >
                    {form.paymentMethod === value ? (
                      <CheckCircle2 aria-hidden="true" className="size-3.5" />
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Button
            className="mt-7 w-full"
            loading={isSubmitting}
            loadingLabel={_copy('Starting secure checkout')}
            size="lg"
            type="submit"
          >
            {_copy('Continue to payment')}
            <CreditCard aria-hidden="true" className="size-4" />
          </Button>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <LockKeyhole
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-success"
            />
            {_copy(
              'Payment is processed securely. WhatsApp appears only after payment confirmation.',
            )}
          </p>
        </div>
      </aside>
    </form>
  );
}
