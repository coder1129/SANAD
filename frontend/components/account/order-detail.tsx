'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { orderKeys, ordersApi, settingsApi, settingsKeys } from '@/lib/api';
import { statusIntent, whatsappHref } from '@/lib/orders/presentation';
import { ReviewForm } from './review-form';
import type { OrderRequirements } from '@/types/domain';

type Props =
  | { id: number; orderNumber?: never; success?: false }
  | { id?: never; orderNumber: string; success: true };

type Instruction = { en: string; ar: string };

function serviceInstructions(serviceName: string): Instruction[] {
  const name = serviceName.toLowerCase();
  if (name.includes('linkedin')) {
    return [
      { en: 'Send your current LinkedIn profile link, if you have one.', ar: 'أرسل رابط حسابك الحالي على لينكدإن إن وُجد.' },
      { en: 'Tell us the target job title, industry, and country.', ar: 'اكتب المسمى الوظيفي والمجال والدولة المستهدفة.' },
      { en: 'If you do not have a profile yet, send your CV or career details to create it.', ar: 'إن لم يكن لديك حساب، أرسل السيرة الذاتية أو بياناتك المهنية لإنشائه.' },
    ];
  }
  if (name.includes('job application') || name.includes('employment') || name.includes('recruit')) {
    return [
      { en: 'Send your current CV and your target job titles.', ar: 'أرسل سيرتك الذاتية الحالية والمسميات الوظيفية المستهدفة.' },
      { en: 'Tell us your preferred country or city and work type.', ar: 'اكتب الدولة أو المدينة ونوع العمل الذي تفضله.' },
      { en: 'Share relevant job links or any additional requirements.', ar: 'أرسل روابط الوظائف المناسبة أو أي متطلبات إضافية.' },
    ];
  }
  if (name.includes('cv') || name.includes('resume')) {
    return [
      { en: 'For a new CV: send your name, contact details, education, experience, skills, and certificates.', ar: 'لسيرة ذاتية جديدة: أرسل الاسم وبيانات التواصل والتعليم والخبرات والمهارات والشهادات.' },
      { en: 'For an existing CV: send the current file and clearly list the required changes.', ar: 'لتعديل سيرة ذاتية موجودة: أرسل الملف الحالي واكتب التعديلات المطلوبة بوضوح.' },
      { en: 'Also tell us the target job title and country, if applicable.', ar: 'اكتب أيضًا المسمى الوظيفي والدولة المستهدفة إن وُجدا.' },
    ];
  }
  return [
    { en: 'Send the documents and details related to your requested service.', ar: 'أرسل المستندات والبيانات المرتبطة بالخدمة المطلوبة.' },
    { en: 'Tell us your target job title, industry, and country when relevant.', ar: 'اكتب المسمى الوظيفي والمجال والدولة المستهدفة عند الحاجة.' },
  ];
}

function requirementLines(
  requirements: OrderRequirements,
  notes: string | null,
  locale: 'en' | 'ar',
): string {
  const labels =
    locale === 'ar'
      ? {
          targetJobTitle: 'المسمى المستهدف',
          targetIndustry: 'المجال',
          targetCountry: 'الدولة المستهدفة',
          yearsOfExperience: 'سنوات الخبرة',
          education: 'التعليم',
          keySkills: 'المهارات',
          careerGoals: 'الأهداف المهنية',
          linkedinUrl: 'لينكدإن',
          portfolioUrl: 'معرض الأعمال',
          targetCompany: 'الشركة المستهدفة',
          jobPostingUrl: 'إعلان الوظيفة',
          firstCv: 'أول سيرة ذاتية',
          notes: 'ملاحظات إضافية',
        }
      : {
          targetJobTitle: 'Target role',
          targetIndustry: 'Industry',
          targetCountry: 'Target country',
          yearsOfExperience: 'Experience',
          education: 'Education',
          keySkills: 'Key skills',
          careerGoals: 'Career goals',
          linkedinUrl: 'LinkedIn',
          portfolioUrl: 'Portfolio',
          targetCompany: 'Target company',
          jobPostingUrl: 'Job posting',
          firstCv: 'First CV',
          notes: 'Additional notes',
        };
  const values = Object.entries(requirements).flatMap(([key, value]) => {
    if (value === undefined || value === null || value === '') return [];
    const label = labels[key as keyof typeof labels];
    if (!label) return [];
    const formatted =
      typeof value === 'boolean'
        ? value
          ? locale === 'ar'
            ? 'نعم'
            : 'Yes'
          : locale === 'ar'
            ? 'لا'
            : 'No'
        : String(value).replace(/\s+/g, ' ').trim();
    return [`${label}: ${formatted}`];
  });
  if (notes?.trim()) {
    values.push(`${labels.notes}: ${notes.replace(/\s+/g, ' ').trim()}`);
  }
  return values.join('\n').slice(0, 2500);
}

export function OrderDetail(props: Props) {
  const _copy = useCopy();

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
        {_copy('Loading order details...')}
      </div>
    );
  if (orderQuery.error)
    return (
      <div className="layout-container py-16">
        <Alert
          title={_copy(
            props.success
              ? 'Order confirmation unavailable'
              : 'Order unavailable',
          )}
          description={_copy(orderQuery.error.userMessage)}
          variant="error"
        />
        <Button asChild className="mt-5" variant="outline">
          <Link href="/my-orders">{_copy('Back to My Orders')}</Link>
        </Button>
      </div>
    );
  const order = orderQuery.data;
  if (!order) return null;
  const hasCollectedPayment = order.payments.some(
    (payment) =>
      ['paid', 'success'].includes(payment.status) && payment.amount > 0,
  );
  const canReview = order.status === 'completed' && hasCollectedPayment;
  const serviceSummary = [order.packageName, order.secondaryPackageName]
    .filter(Boolean)
    .join(' + ');
  const localizedServiceSummary = [
    _copy(order.packageName ?? 'SANAD career service', order.packageNameAr),
    order.secondaryPackageName
      ? _copy(order.secondaryPackageName, order.secondaryPackageNameAr)
      : null,
  ]
    .filter(Boolean)
    .join(' + ');
  const otherDiscountAmount = Math.max(
    0,
    order.discountAmount - order.secondaryDiscountAmount,
  );
  const instructions = serviceInstructions(serviceSummary);
  const requirementsEn = requirementLines(
    order.requirements,
    order.notes,
    'en',
  );
  const requirementsAr = requirementLines(
    order.requirements,
    order.notes,
    'ar',
  );
  const message = props.success
    ? `Hello SANAD,\n\nI'm contacting you regarding my order.\n\nOrder: #${order.orderNumber}\nServices: ${serviceSummary || 'SANAD career service'}${requirementsEn ? `\n\nMy request details:\n${requirementsEn}` : ''}\n\nI will send the supporting documents in this chat.`
    : `Hello SANAD,\n\nI'm contacting you regarding:\n\nOrder: #${order.orderNumber}\nServices: ${serviceSummary || 'SANAD career service'}${requirementsEn ? `\n\nMy request details:\n${requirementsEn}` : ''}`;
  const localizedMessage =
    _copy.locale === 'ar'
      ? `مرحبًا سند،\n\nأتواصل معكم بخصوص الطلب رقم #${order.orderNumber}\nالخدمات: ${localizedServiceSummary}${requirementsAr ? `\n\nتفاصيل طلبي:\n${requirementsAr}` : ''}${props.success ? '\n\nسأرسل المستندات المطلوبة في هذه المحادثة.' : ''}`
      : message;
  const whatsapp = whatsappHref(
    settingsQuery.data?.whatsapp_number,
    localizedMessage,
  );

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
              {_copy(
                hasCollectedPayment ? 'Payment confirmed' : 'Request received',
              )}
            </p>
            <h1 className="type-h1 mt-2 text-primary">
              {_copy(
                hasCollectedPayment ? 'Order Confirmed' : 'Order Received',
              )}
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {_copy(
                hasCollectedPayment
                  ? 'Your payment and order are confirmed. Continue with the SANAD team on WhatsApp to send your documents and requirements.'
                  : 'Your request is safely recorded and no payment has been confirmed yet. Continue on WhatsApp to arrange payment and send your requirements.',
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
            {_copy('Customer account')}
          </p>
          <h1 className="type-h1 mt-3 text-primary">
            {_copy('Order #')}
            {_copy(order.orderNumber)}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {_copy(
              'Review the purchase and continue your service conversation.',
            )}
          </p>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="border border-border bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="text-sm text-muted-foreground">
                {_copy('Service')}
              </p>
              <h2 className="type-h3 mt-2 text-primary">
                {_copy(
                  order.packageName ?? 'SANAD career service',
                  order.packageNameAr,
                )}
              </h2>
              {order.secondaryPackageName ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {_copy('Second service:', 'الخدمة الثانية:')}{' '}
                  <strong className="text-foreground">
                    {_copy(
                      order.secondaryPackageName,
                      order.secondaryPackageNameAr,
                    )}
                  </strong>
                </p>
              ) : null}
            </div>
            <StatusBadge intent={statusIntent(order.status)}>
              {_copy(_copy.status(order.status))}
            </StatusBadge>
          </div>
          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground uppercase">
                {_copy('Order Number')}
              </dt>
              <dd className="mt-1 font-semibold">
                {_copy('#')}
                {_copy(order.orderNumber)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">
                {_copy('Purchase Date')}
              </dt>
              <dd className="mt-1 font-semibold">
                {_copy(_copy.date(order.createdAt))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">
                {_copy('Payment Status')}
              </dt>
              <dd className="mt-2">
                <StatusBadge intent={statusIntent(order.paymentStatus)}>
                  {_copy(_copy.status(order.paymentStatus))}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">
                {_copy('Order Status')}
              </dt>
              <dd className="mt-2">
                <StatusBadge intent={statusIntent(order.status)}>
                  {_copy(_copy.status(order.status))}
                </StatusBadge>
              </dd>
            </div>
          </dl>
          <div className="mt-8 border-t border-border pt-6">
            <h2 className="font-semibold text-primary">
              {_copy('Payment summary')}
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {_copy(
                    order.secondaryPackageId
                      ? 'Primary service price'
                      : 'Service price',
                    order.secondaryPackageId
                      ? 'سعر الخدمة الأساسية'
                      : 'سعر الخدمة',
                  )}
                </dt>
                <dd>
                  {_copy(
                    _copy.money(
                      order.originalAmount - order.secondaryOriginalAmount,
                      order.currency,
                    ),
                  )}
                </dd>
              </div>
              {order.secondaryPackageId ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {_copy('Second service price', 'سعر الخدمة الثانية')}
                  </dt>
                  <dd>
                    {_copy(
                      _copy.money(
                        order.secondaryOriginalAmount,
                        order.currency,
                      ),
                    )}
                  </dd>
                </div>
              ) : null}
              {order.secondaryDiscountAmount > 0 ? (
                <div className="flex justify-between gap-4 text-success">
                  <dt>
                    {_copy('Second service saving', 'خصم الخدمة الثانية')}
                  </dt>
                  <dd>
                    {_copy('-')}
                    {_copy(
                      _copy.money(
                        order.secondaryDiscountAmount,
                        order.currency,
                      ),
                    )}
                  </dd>
                </div>
              ) : null}
              {otherDiscountAmount > 0 ? (
                <div className="flex justify-between gap-4 text-success">
                  <dt>
                    {_copy('Discount')}
                    {_copy(order.couponCode ? ` (${order.couponCode})` : '')}
                  </dt>
                  <dd>
                    {_copy('-')}
                    {_copy(_copy.money(otherDiscountAmount, order.currency))}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
                <dt>{_copy('Total')}</dt>
                <dd>{_copy(_copy.money(order.finalAmount, order.currency))}</dd>
              </div>
            </dl>
          </div>
        </div>
        <aside className="h-fit border border-border bg-surface-muted p-6">
          <h2 className="type-h4 text-primary">{_copy('What&apos;s Next?')}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {_copy(
              hasCollectedPayment
                ? 'Continue with the SANAD team on WhatsApp to send your documents, requirements, and career information.'
                : 'Continue with the SANAD team on WhatsApp to receive your payment link or QR code, then send your documents and requirements.',
            )}
          </p>
          <div className="mt-5 border-y border-border py-4">
            <h3 className="text-sm font-semibold text-primary">
              {_copy('What to send on WhatsApp', 'ما الذي سترسله على واتساب؟')}
            </h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
              {instructions.map((instruction) => (
                <li className="flex gap-2" key={instruction.en}>
                  <span aria-hidden="true" className="text-success">•</span>
                  {_copy(instruction.en, instruction.ar)}
                </li>
              ))}
            </ul>
          </div>
          {whatsapp ? (
            <Button asChild className="mt-6 w-full">
              <a href={whatsapp} rel="noreferrer noopener" target="_blank">
                <MessageCircle className="size-4" aria-hidden="true" />
                {_copy('Continue on WhatsApp')}
              </a>
            </Button>
          ) : (
            <Alert
              className="mt-5"
              title={_copy('WhatsApp unavailable')}
              description={_copy(
                settingsQuery.isPending
                  ? 'Loading contact details...'
                  : 'The WhatsApp contact has not been configured yet.',
              )}
              variant="warning"
            />
          )}
          {_copy(' ')}
          {!props.success ? (
            <Button asChild className="mt-3 w-full" variant="outline">
              <Link href="/my-orders">{_copy('Back to My Orders')}</Link>
            </Button>
          ) : null}
        </aside>
      </div>
      {canReview ? (
        <div className="mt-8 border border-border bg-surface p-6 sm:p-8">
          <ReviewForm orderId={order.id} />
        </div>
      ) : !props.success ? (
        <Alert
          className="mt-8"
          title={_copy('Review not available yet', 'التقييم غير متاح بعد')}
          description={_copy(
            order.status !== 'completed'
              ? 'You can rate this service once the SANAD team marks your order as completed.'
              : 'A confirmed collected payment is required before this service can be rated.',
            order.status !== 'completed'
              ? 'يمكنك تقييم هذه الخدمة بعد أن يغيّر فريق سند حالة طلبك إلى مكتمل.'
              : 'يلزم تأكيد تحصيل الدفع قبل أن تتمكن من تقييم هذه الخدمة.',
          )}
          variant="info"
        />
      ) : null}
    </section>
  );
}
