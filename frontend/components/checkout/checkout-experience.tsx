'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  LockKeyhole,
  MessageCircle,
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
import {
  checkoutApi,
  isApiError,
  ordersApi,
  packagesApi,
  paymentsApi,
} from '@/lib/api';
import type {
  CareerPackage,
  CompanionOffer,
  CheckoutPaymentMethod,
  CheckoutPricing,
  PaymentResult,
} from '@/types/domain';

interface CheckoutExperienceProps {
  checkoutMode: 'manual' | 'gateway';
  packageItem: CareerPackage;
  pricing: CheckoutPricing;
}

interface CheckoutFormState {
  phone: string | null;
  targetJobTitle: string;
  targetIndustry: string;
  targetCountry: string;
  yearsOfExperience: string;
  education: string;
  keySkills: string;
  careerGoals: string;
  linkedinUrl: string;
  portfolioUrl: string;
  targetCompany: string;
  jobPostingUrl: string;
  firstCv: boolean;
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

interface CouponMessage {
  en: string;
  ar: string;
}

const COUPON_MESSAGES: Record<string, CouponMessage> = {
  COUPON_NOT_FOUND: {
    en: 'This coupon code is not valid.',
    ar: 'كود الخصم غير صحيح.',
  },
  COUPON_INACTIVE: {
    en: 'This coupon is no longer active.',
    ar: 'كود الخصم غير نشط.',
  },
  COUPON_NOT_STARTED: {
    en: 'This coupon is not active yet.',
    ar: 'لم يبدأ تفعيل كود الخصم بعد.',
  },
  COUPON_EXPIRED: {
    en: 'This coupon has expired.',
    ar: 'انتهت صلاحية كود الخصم.',
  },
  COUPON_LIMIT_REACHED: {
    en: 'This coupon has reached its usage limit.',
    ar: 'تم استهلاك الحد المتاح لكود الخصم.',
  },
  COUPON_ALREADY_USED: {
    en: 'You have already used this coupon.',
    ar: 'استخدمت كود الخصم هذا من قبل.',
  },
  COUPON_MIN_AMOUNT: {
    en: 'Your order does not meet this coupon’s minimum amount.',
    ar: 'الطلب لا يحقق الحد الأدنى لاستخدام كود الخصم.',
  },
  COUPON_VALUE_INVALID: {
    en: 'This coupon is not configured correctly. Please contact support.',
    ar: 'إعدادات كود الخصم غير صحيحة. يرجى التواصل مع الدعم.',
  },
};

const DEFAULT_COUPON_ERROR: CouponMessage = {
  en: 'We could not apply this coupon. Please try again.',
  ar: 'تعذر تطبيق كود الخصم. يرجى المحاولة مرة أخرى.',
};

function getCouponError(error: unknown): CouponMessage {
  if (isApiError(error) && error.code) {
    return COUPON_MESSAGES[error.code] ?? DEFAULT_COUPON_ERROR;
  }

  return DEFAULT_COUPON_ERROR;
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

function isPaymentComplete(payment: PaymentResult): boolean {
  return (
    payment.bypassed ||
    payment.requiresPayment === false ||
    ['paid', 'completed', 'success'].includes(payment.status.toLowerCase())
  );
}

function discountedPrice(price: number, discountPercentage: number): number {
  return Math.max(
    0,
    Math.round(price * (1 - discountPercentage / 100) * 100) / 100,
  );
}

function getBestOfferForPackage(
  offers: CompanionOffer[],
  packageId: number,
): CompanionOffer | undefined {
  return offers
    .filter(
      (offer) =>
        offer.type === 'cross_service_any' || offer.packageId === packageId,
    )
    .sort(
      (first, second) => second.discountPercentage - first.discountPercentage,
    )[0];
}

type ServiceKind = 'cv' | 'cover_letter' | 'linkedin' | 'general';

function getServiceKind(packageItem: CareerPackage): ServiceKind {
  const name = `${packageItem.name} ${packageItem.nameAr ?? ''}`.toLowerCase();
  if (name.includes('linkedin') || name.includes('لينكد')) return 'linkedin';
  if (name.includes('cover') || name.includes('خطاب')) return 'cover_letter';
  if (name.includes('cv') || name.includes('resume') || name.includes('سيرة'))
    return 'cv';
  return 'general';
}

const SERVICE_GUIDANCE: Record<
  ServiceKind,
  { title: string; titleAr: string; description: string; descriptionAr: string }
> = {
  cv: {
    title: 'Preparing your CV request',
    titleAr: 'تجهيز طلب السيرة الذاتية',
    description:
      'If this is your first CV, that is completely fine. Add your education, experience and skills below, then send any certificates or existing documents on WhatsApp.',
    descriptionAr:
      'إذا كانت هذه أول سيرة ذاتية لك فلا مشكلة. أضف تعليمك وخبراتك ومهاراتك أدناه، ثم أرسل الشهادات أو المستندات المتاحة عبر واتساب.',
  },
  cover_letter: {
    title: 'Preparing your cover letter request',
    titleAr: 'تجهيز طلب خطاب التقديم',
    description:
      'Add the target company and job posting when available. Your saved career profile will provide the shared background information.',
    descriptionAr:
      'أضف الشركة المستهدفة ورابط إعلان الوظيفة إن توفر. سنستخدم بيانات ملفك المهني للمعلومات المشتركة.',
  },
  linkedin: {
    title: 'Preparing your LinkedIn request',
    titleAr: 'تجهيز طلب لينكدإن',
    description:
      'Add your LinkedIn profile link and the role or market you want to target. You will not need to repeat saved career information.',
    descriptionAr:
      'أضف رابط حسابك على لينكدإن والوظيفة أو السوق الذي تستهدفه. لن تحتاج إلى تكرار بياناتك المهنية المحفوظة.',
  },
  general: {
    title: 'Information for your service',
    titleAr: 'معلومات الخدمة',
    description:
      'Add the context that will help the SANAD team understand your goal. Saved career details are reused automatically.',
    descriptionAr:
      'أضف المعلومات التي تساعد فريق سند على فهم هدفك. نعيد استخدام بياناتك المهنية المحفوظة تلقائيًا.',
  },
};

export function CheckoutExperience({
  checkoutMode,
  packageItem,
  pricing,
}: CheckoutExperienceProps) {
  const _copy = useCopy();

  const pathname = usePathname();
  const router = useRouter();
  const openAuthModal = useAuthModal();
  const { user, isAuthenticated, isInitializing } = useAuth();
  const [form, setForm] = useState<CheckoutFormState>({
    phone: user?.phone ?? null,
    targetJobTitle: '',
    targetIndustry: '',
    targetCountry: '',
    yearsOfExperience: '',
    education: '',
    keySkills: '',
    careerGoals: '',
    linkedinUrl: '',
    portfolioUrl: '',
    targetCompany: '',
    jobPostingUrl: '',
    firstCv: false,
    notes: '',
    paymentMethod: 'card',
    couponCode: '',
  });
  const [displayPricing, setDisplayPricing] = useState(pricing);
  const [packages, setPackages] = useState<CareerPackage[]>([]);
  const [secondaryPackageId, setSecondaryPackageId] = useState<number | null>(
    null,
  );
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<CouponMessage | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PaymentResult | null>(
    null,
  );
  const serviceKind = getServiceKind(packageItem);
  function updateField<K extends keyof CheckoutFormState>(
    field: K,
    value: CheckoutFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    if (field === 'couponCode') setCouponError(null);
    setError(null);
  }

  const companionOffers = packageItem.companionOffers ?? [];
  const bestAnyServiceOffer = companionOffers
    .filter((offer) => offer.type === 'cross_service_any')
    .sort(
      (first, second) => second.discountPercentage - first.discountPercentage,
    )[0];
  const specificOffers = Array.from(
    companionOffers
      .filter(
        (offer) => offer.type === 'cross_service_specific' && offer.packageId,
      )
      .reduce((offersByPackage, offer) => {
        const current = offersByPackage.get(offer.packageId!);
        if (!current || offer.discountPercentage > current.discountPercentage) {
          offersByPackage.set(offer.packageId!, offer);
        }
        return offersByPackage;
      }, new Map<number, CompanionOffer>())
      .values(),
  ).sort(
    (first, second) => second.discountPercentage - first.discountPercentage,
  );
  const selectedCompanionOffer = secondaryPackageId
    ? getBestOfferForPackage(companionOffers, secondaryPackageId)
    : undefined;

  useEffect(() => {
    if (!bestAnyServiceOffer) return;
    void packagesApi
      .list()
      .then((result) =>
        setPackages(result.items.filter((item) => item.id !== packageItem.id)),
      );
  }, [bestAnyServiceOffer, packageItem.id]);

  async function refreshPricing(
    nextSecondaryPackageId = secondaryPackageId,
    couponCode = form.couponCode.trim(),
  ) {
    const nextPricing = await checkoutApi.preview({
      packageId: packageItem.id,
      offerId: pricing.offerId ?? undefined,
      ...(nextSecondaryPackageId
        ? { secondaryPackageId: nextSecondaryPackageId }
        : {}),
      ...(couponCode ? { couponCode } : {}),
    });
    setDisplayPricing(nextPricing);
  }

  async function selectSecondaryPackage(id: number) {
    setError(null);
    setSecondaryPackageId(id);
    try {
      await refreshPricing(id);
    } catch (requestError) {
      setSecondaryPackageId(null);
      setDisplayPricing(pricing);
      setError(
        isApiError(requestError)
          ? requestError.userMessage
          : 'We could not apply this service offer.',
      );
    }
  }

  async function clearSecondaryPackage() {
    setError(null);
    setSecondaryPackageId(null);
    try {
      await refreshPricing(null);
    } catch {
      setDisplayPricing(pricing);
    }
  }

  async function applyCoupon() {
    const couponCode = form.couponCode.trim();
    setError(null);
    if (!couponCode) {
      setCouponError({
        en: 'Enter a coupon code before applying it.',
        ar: 'أدخل كود الخصم قبل تطبيقه.',
      });
      return;
    }

    setCouponError(null);
    setIsApplyingCoupon(true);
    try {
      await refreshPricing(secondaryPackageId, couponCode);
    } catch (requestError) {
      // Preserve the currently displayed pricing (including a selected second
      // service) and show the validation feedback beside the coupon input.
      setCouponError(getCouponError(requestError));
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPendingPayment(null);
    setIsSubmitting(true);

    try {
      const order = await ordersApi.create({
        packageId: packageItem.id,
        offerId: displayPricing.offerId ?? undefined,
        couponCode: displayPricing.couponCode ?? undefined,
        secondaryPackageId: displayPricing.secondaryPackageId ?? undefined,
        customerPhone: user?.phone?.trim() ?? '',
      });
      if (checkoutMode === 'manual') {
        router.replace(
          `/order-success/${encodeURIComponent(order.orderNumber)}`,
        );
        return;
      }

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
            checkoutMode === 'manual'
              ? 'Your account keeps the order and WhatsApp handoff connected in one place.'
              : 'Your account keeps the order, payment, and WhatsApp handoff connected in one place.',
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
              {_copy('Complete your order')}
            </p>
            <h2 className="type-h3 mt-2 text-primary">
              {_copy('Review and submit your request')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {_copy(
                'After submitting, you will receive clear instructions for sending your information directly on WhatsApp.',
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

        <div aria-hidden="true" hidden>
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
          <div>
            <label
              className="type-label text-foreground"
              htmlFor="checkout-country"
            >
              {_copy('Target country')}
            </label>
            <Input
              className="mt-2"
              id="checkout-country"
              onChange={(event) =>
                updateField('targetCountry', event.target.value)
              }
              placeholder={_copy('e.g. UAE or Saudi Arabia')}
              value={form.targetCountry}
            />
          </div>
          {serviceKind === 'cv' ? (
            <>
              <div>
                <label
                  className="type-label text-foreground"
                  htmlFor="checkout-experience"
                >
                  {_copy('Years of experience')}
                </label>
                <Input
                  className="mt-2"
                  id="checkout-experience"
                  onChange={(event) =>
                    updateField('yearsOfExperience', event.target.value)
                  }
                  placeholder={_copy('e.g. 5 years')}
                  value={form.yearsOfExperience}
                />
              </div>
              <label className="flex items-start gap-3 border border-border bg-surface-muted p-4 sm:col-span-2">
                <input
                  checked={form.firstCv}
                  className="mt-1"
                  onChange={(event) =>
                    updateField('firstCv', event.target.checked)
                  }
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-semibold">
                    {_copy('This is my first CV')}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {_copy(
                      'You can continue without an existing CV. Add what you know and send supporting documents on WhatsApp.',
                    )}
                  </span>
                </span>
              </label>
              <div className="sm:col-span-2">
                <label
                  className="type-label text-foreground"
                  htmlFor="checkout-education"
                >
                  {_copy('Education')}
                </label>
                <Textarea
                  className="mt-2"
                  id="checkout-education"
                  onChange={(event) =>
                    updateField('education', event.target.value)
                  }
                  placeholder={_copy('Degree, major, institution and year')}
                  value={form.education}
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  className="type-label text-foreground"
                  htmlFor="checkout-skills"
                >
                  {_copy('Key skills')}
                </label>
                <Textarea
                  className="mt-2"
                  id="checkout-skills"
                  onChange={(event) =>
                    updateField('keySkills', event.target.value)
                  }
                  placeholder={_copy(
                    'Your strongest technical and soft skills',
                  )}
                  value={form.keySkills}
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  className="type-label text-foreground"
                  htmlFor="checkout-portfolio"
                >
                  {_copy('Portfolio URL')}
                </label>
                <Input
                  className="mt-2"
                  id="checkout-portfolio"
                  onChange={(event) =>
                    updateField('portfolioUrl', event.target.value)
                  }
                  placeholder="https://"
                  type="url"
                  value={form.portfolioUrl}
                />
              </div>
            </>
          ) : null}
          {serviceKind === 'linkedin' ? (
            <div className="sm:col-span-2">
              <label
                className="type-label text-foreground"
                htmlFor="checkout-linkedin"
              >
                {_copy('LinkedIn profile URL')}
              </label>
              <Input
                className="mt-2"
                id="checkout-linkedin"
                onChange={(event) =>
                  updateField('linkedinUrl', event.target.value)
                }
                placeholder="https://www.linkedin.com/in/..."
                type="url"
                value={form.linkedinUrl}
              />
            </div>
          ) : null}
          {serviceKind === 'cover_letter' ? (
            <>
              <div>
                <label
                  className="type-label text-foreground"
                  htmlFor="checkout-company"
                >
                  {_copy('Target company')}
                </label>
                <Input
                  className="mt-2"
                  id="checkout-company"
                  onChange={(event) =>
                    updateField('targetCompany', event.target.value)
                  }
                  value={form.targetCompany}
                />
              </div>
              <div>
                <label
                  className="type-label text-foreground"
                  htmlFor="checkout-job-posting"
                >
                  {_copy('Job posting URL')}
                </label>
                <Input
                  className="mt-2"
                  id="checkout-job-posting"
                  onChange={(event) =>
                    updateField('jobPostingUrl', event.target.value)
                  }
                  placeholder="https://"
                  type="url"
                  value={form.jobPostingUrl}
                />
              </div>
            </>
          ) : null}
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
                value={form.phone ?? user.phone ?? ''}
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
          <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">
            {_copy(
              'Your text details are saved with the order and added to the prepared WhatsApp message. You can review the message before sending it; supporting files are attached separately in WhatsApp.',
              'تُحفظ البيانات النصية مع الطلب وتُضاف إلى رسالة واتساب المجهزة. يمكنك مراجعة الرسالة قبل إرسالها، وتُرفق الملفات المساندة بشكل منفصل في واتساب.',
            )}
          </p>
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
                {_copy(
                  displayPricing.secondaryPackageId
                    ? 'Primary service'
                    : 'Service price',
                  displayPricing.secondaryPackageId
                    ? 'الخدمة الأساسية'
                    : 'سعر الخدمة',
                )}
              </dt>
              <dd className="font-semibold text-foreground">
                {_copy(
                  _copy.money(
                    displayPricing.originalPrice -
                      displayPricing.secondaryOriginalPrice,
                    displayPricing.currency,
                  ),
                )}
              </dd>
            </div>
            {displayPricing.secondaryPackageId ? (
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">
                  <span className="block">
                    {_copy('Second service', 'الخدمة الثانية')}
                  </span>
                  <span className="block text-xs">
                    {_copy(
                      displayPricing.secondaryPackageName ?? 'Selected service',
                      displayPricing.secondaryPackageNameAr,
                    )}
                  </span>
                </dt>
                <dd className="font-semibold text-foreground">
                  {_copy(
                    _copy.money(
                      displayPricing.secondaryOriginalPrice,
                      displayPricing.currency,
                    ),
                  )}
                </dd>
              </div>
            ) : null}
            {displayPricing.offerDiscountAmount > 0 ? (
              <div className="flex items-center justify-between gap-4 text-success">
                <dt>
                  {_copy(
                    displayPricing.secondaryPackageId
                      ? `Second service offer (${displayPricing.offerDiscountPercentage}%)`
                      : 'Offer saving',
                    displayPricing.secondaryPackageId
                      ? `خصم الخدمة الثانية (${displayPricing.offerDiscountPercentage}%)`
                      : 'قيمة الخصم',
                  )}
                </dt>
                <dd className="font-semibold">
                  {_copy('-')}
                  {_copy(
                    _copy.money(
                      displayPricing.offerDiscountAmount,
                      displayPricing.currency,
                    ),
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
                {_copy(
                  _copy.money(
                    displayPricing.finalAmount,
                    displayPricing.currency,
                  ),
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-border pt-5">
            <label
              className="type-label text-foreground"
              htmlFor="checkout-coupon"
            >
              {_copy('Coupon Code')}
            </label>
            <div className="mt-2 flex gap-2">
              <Input
                aria-describedby={
                  couponError ? 'checkout-coupon-error' : undefined
                }
                aria-invalid={couponError ? true : undefined}
                id="checkout-coupon"
                onChange={(event) =>
                  updateField('couponCode', event.target.value)
                }
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
            {couponError ? (
              <p
                className="mt-2 text-xs text-error"
                id="checkout-coupon-error"
                role="alert"
              >
                {_copy(couponError.en, couponError.ar)}
              </p>
            ) : null}
            {displayPricing.couponCode ? (
              <p className="mt-2 text-xs text-success">
                {_copy('Coupon applied')}: {_copy(displayPricing.couponCode)}
              </p>
            ) : null}
          </div>

          {companionOffers.length > 0 ? (
            <div className="mt-6 border-t border-border pt-5">
              <p className="type-label text-foreground">
                {_copy('Second service offers', 'عروض الخدمة الثانية')}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {_copy(
                  'Add one optional service to this order. The discount applies to the second service only.',
                  'أضف خدمة اختيارية واحدة إلى الطلب، ويُطبّق الخصم على الخدمة الثانية فقط.',
                )}
              </p>

              {specificOffers.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {specificOffers.map((offer) => {
                    const checked = secondaryPackageId === offer.packageId;
                    const originalPrice = offer.packagePrice ?? 0;
                    return (
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        key={offer.id}
                      >
                        <input
                          checked={checked}
                          className="mt-1 size-4 accent-primary"
                          onChange={(event) => {
                            if (event.target.checked) {
                              void selectSecondaryPackage(offer.packageId!);
                            } else {
                              void clearSecondaryPackage();
                            }
                          }}
                          type="checkbox"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-foreground">
                            {_copy(offer.name, offer.nameAr)}
                          </span>
                          <span className="mt-1 block text-muted-foreground">
                            {_copy(
                              offer.packageName ?? 'Selected second service',
                              offer.packageNameAr,
                            )}{' '}
                            {_copy('·')} {_copy(offer.discountPercentage)}%
                            {_copy(' off', ' خصم')}
                          </span>
                          {originalPrice > 0 ? (
                            <span className="mt-1 block text-xs text-muted-foreground">
                              <span className="line-through">
                                {_copy(
                                  _copy.money(
                                    originalPrice,
                                    displayPricing.currency,
                                  ),
                                )}
                              </span>{' '}
                              <strong className="text-success no-underline">
                                {_copy(
                                  _copy.money(
                                    discountedPrice(
                                      originalPrice,
                                      offer.discountPercentage,
                                    ),
                                    displayPricing.currency,
                                  ),
                                )}
                              </strong>
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {bestAnyServiceOffer ? (
                <label className="mt-3 grid gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="font-semibold text-foreground">
                    {_copy(
                      bestAnyServiceOffer.name,
                      bestAnyServiceOffer.nameAr,
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {_copy(
                      'Choose any second service and save',
                      'اختر أي خدمة ثانية ووفّر',
                    )}{' '}
                    <strong>
                      {_copy(bestAnyServiceOffer.discountPercentage)}%
                    </strong>
                  </span>
                  <select
                    className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3 text-foreground"
                    onChange={(event) => {
                      const id = Number(event.target.value);
                      if (id) void selectSecondaryPackage(id);
                      else void clearSecondaryPackage();
                    }}
                    value={secondaryPackageId ?? 0}
                  >
                    <option value="0">{_copy('Select package')}</option>
                    {packages.map((item) => {
                      const applicableOffer = getBestOfferForPackage(
                        companionOffers,
                        item.id,
                      );
                      const finalPrice = discountedPrice(
                        item.price,
                        applicableOffer?.discountPercentage ??
                          bestAnyServiceOffer.discountPercentage,
                      );
                      return (
                        <option key={item.id} value={item.id}>
                          {_copy(item.name, item.nameAr)} —{' '}
                          {_copy(
                            _copy.money(finalPrice, displayPricing.currency),
                          )}
                        </option>
                      );
                    })}
                  </select>
                </label>
              ) : null}

              {displayPricing.secondaryPackageId ? (
                <div className="mt-3 rounded-md bg-success/10 p-3 text-sm text-success">
                  <p className="font-semibold">
                    {_copy(
                      displayPricing.secondaryPackageName ??
                        'Second service added',
                      displayPricing.secondaryPackageNameAr,
                    )}
                  </p>
                  <p className="mt-1 text-xs">
                    {_copy('Saving', 'التوفير')}: {_copy('-')}
                    {_copy(
                      _copy.money(
                        displayPricing.secondaryDiscountAmount,
                        displayPricing.currency,
                      ),
                    )}
                    {selectedCompanionOffer ? (
                      <>
                        {' '}
                        ({_copy(selectedCompanionOffer.discountPercentage)}%)
                      </>
                    ) : null}
                  </p>
                  <button
                    className="mt-2 text-xs font-semibold underline underline-offset-2"
                    onClick={() => void clearSecondaryPackage()}
                    type="button"
                  >
                    {_copy('Remove second service', 'إزالة الخدمة الثانية')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {checkoutMode === 'gateway' ? (
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
          ) : (
            <Alert
              className="mt-7"
              title={_copy('Payment arranged on WhatsApp')}
              description={_copy(
                'Submit your request first. The SANAD team will send you the appropriate payment link or QR code on WhatsApp.',
              )}
            />
          )}

          <Button
            className="mt-7 w-full"
            loading={isSubmitting}
            loadingLabel={_copy(
              checkoutMode === 'manual'
                ? 'Submitting request'
                : 'Starting secure checkout',
            )}
            size="lg"
            type="submit"
          >
            {_copy(
              checkoutMode === 'manual'
                ? 'Submit request'
                : 'Continue to payment',
            )}
            {checkoutMode === 'manual' ? (
              <MessageCircle aria-hidden="true" className="size-4" />
            ) : (
              <CreditCard aria-hidden="true" className="size-4" />
            )}
          </Button>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <LockKeyhole
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-success"
            />
            {_copy(
              checkoutMode === 'manual'
                ? 'No payment is taken on this page. Your request stays awaiting payment until an administrator confirms the amount received.'
                : 'Payment is processed securely. WhatsApp appears only after payment confirmation.',
            )}
          </p>
        </div>
      </aside>
    </form>
  );
}
