'use client';

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
import { useState, type FormEvent } from 'react';

import { useAuthModal } from '@/components/auth/auth-modal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { isApiError, ordersApi, paymentsApi } from '@/lib/api';
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

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

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
  });
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
        offerId: pricing.offerId ?? undefined,
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
          Restoring your secure session...
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
        <h2 className="type-h3 mt-6 text-primary">Sign in to continue</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Your account keeps the order, payment, and WhatsApp handoff connected
          in one place.
        </p>
        <Button
          className="mt-7 min-w-48"
          onClick={() => openAuthModal(pathname)}
          size="lg"
        >
          Open sign in
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          The sign-in form opens in a centered modal on this page.
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
          Continue to secure payment
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your order is saved. Complete payment with our secure provider, then
          return here to continue to WhatsApp.
        </p>
        <Button asChild className="mt-7" size="lg">
          <a href={pendingPayment.paymentUrl ?? '#'}>
            Open secure payment
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
              Your details
            </p>
            <h2 className="type-h3 mt-2 text-primary">
              Help us prepare your order
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A few details help the service owner start with the right context.
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
            description={error}
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
              Account email
            </label>
            <Input
              className="mt-2"
              id="checkout-email"
              readOnly
              value={user.email}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Signed in as {user.name}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label
              className="type-label text-foreground"
              htmlFor="checkout-phone"
            >
              WhatsApp phone <span className="text-error">*</span>
            </label>
            <div className="relative mt-2">
              <Phone
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-invalid={fieldErrors.phone ? true : undefined}
                className="pl-10"
                id="checkout-phone"
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="+966 5X XXX XXXX"
                value={form.phone || user.phone || ''}
              />
            </div>
            {fieldErrors.phone ? (
              <p className="mt-2 text-sm text-error">{fieldErrors.phone}</p>
            ) : null}
          </div>
          <div>
            <label
              className="type-label text-foreground"
              htmlFor="checkout-job-title"
            >
              Target job title
            </label>
            <Input
              aria-invalid={fieldErrors.targetJobTitle ? true : undefined}
              className="mt-2"
              id="checkout-job-title"
              onChange={(event) =>
                updateField('targetJobTitle', event.target.value)
              }
              placeholder="e.g. Product Manager"
              value={form.targetJobTitle}
            />
            {fieldErrors.targetJobTitle ? (
              <p className="mt-2 text-sm text-error">
                {fieldErrors.targetJobTitle}
              </p>
            ) : null}
          </div>
          <div>
            <label
              className="type-label text-foreground"
              htmlFor="checkout-industry"
            >
              Target industry
            </label>
            <Input
              aria-invalid={fieldErrors.targetIndustry ? true : undefined}
              className="mt-2"
              id="checkout-industry"
              onChange={(event) =>
                updateField('targetIndustry', event.target.value)
              }
              placeholder="e.g. FinTech / SaaS"
              value={form.targetIndustry}
            />
            {fieldErrors.targetIndustry ? (
              <p className="mt-2 text-sm text-error">
                {fieldErrors.targetIndustry}
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label
              className="type-label text-foreground"
              htmlFor="checkout-goals"
            >
              Career goals
            </label>
            <Textarea
              aria-invalid={fieldErrors.careerGoals ? true : undefined}
              className="mt-2"
              id="checkout-goals"
              onChange={(event) =>
                updateField('careerGoals', event.target.value)
              }
              placeholder="What would you like this service to help you achieve?"
              value={form.careerGoals}
            />
            {fieldErrors.careerGoals ? (
              <p className="mt-2 text-sm text-error">
                {fieldErrors.careerGoals}
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label
              className="type-label text-foreground"
              htmlFor="checkout-notes"
            >
              Additional notes
            </label>
            <Textarea
              aria-invalid={fieldErrors.notes ? true : undefined}
              className="mt-2"
              id="checkout-notes"
              onChange={(event) => updateField('notes', event.target.value)}
              placeholder="Anything else the service owner should know?"
              value={form.notes}
            />
            {fieldErrors.notes ? (
              <p className="mt-2 text-sm text-error">{fieldErrors.notes}</p>
            ) : null}
          </div>
        </div>
      </section>

      <aside className="h-fit rounded-xl border border-border bg-surface shadow-sm lg:sticky lg:top-6">
        <div className="border-b border-border bg-surface-muted p-6">
          <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
            Order summary
          </p>
          <h2 className="mt-2 text-lg font-semibold text-primary">
            {packageItem.name}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Delivered in {pricing.deliveryDays} days
          </p>
        </div>
        <div className="p-6">
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Service price</dt>
              <dd className="font-semibold text-foreground">
                {formatMoney(pricing.originalPrice, pricing.currency)}
              </dd>
            </div>
            {pricing.offerDiscountAmount > 0 ? (
              <div className="flex items-center justify-between gap-4 text-success">
                <dt>Offer saving</dt>
                <dd className="font-semibold">
                  -{formatMoney(pricing.offerDiscountAmount, pricing.currency)}
                </dd>
              </div>
            ) : null}
            <div className="mt-2 flex items-end justify-between gap-4 border-t border-border pt-4">
              <dt className="font-semibold text-primary">Total</dt>
              <dd className="font-display text-3xl leading-none text-primary">
                {formatMoney(pricing.finalAmount, pricing.currency)}
              </dd>
            </div>
          </dl>

          <fieldset className="mt-7">
            <legend className="type-label text-foreground">
              Payment method
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
                      {label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {detail}
                    </span>
                  </span>
                  <span
                    className={`ml-auto grid size-5 place-items-center rounded-full border ${form.paymentMethod === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}
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
            loadingLabel="Starting secure checkout"
            size="lg"
            type="submit"
          >
            Continue to payment
            <CreditCard aria-hidden="true" className="size-4" />
          </Button>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <LockKeyhole
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-success"
            />
            Payment is processed securely. WhatsApp appears only after payment
            confirmation.
          </p>
        </div>
      </aside>
    </form>
  );
}
