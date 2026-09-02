import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  FileCheck2,
  ListChecks,
  MessageCircle,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

import { PackageGallery } from '@/components/packages/package-gallery';
import {
  getOrderDisplayPrice,
  PackageOrderCard,
} from '@/components/packages/package-order-card';
import { PackageRelatedCard } from '@/components/packages/package-related-card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PUBLIC_WHATSAPP_HREF } from '@/constants/public-navigation';
import { checkoutApi, isApiError, packagesApi } from '@/lib/api';
import { getPackageDetailContent } from '@/lib/packages/detail-content';
import {
  getBestPackageOffer,
  getPackageCurrentPrice,
  getPackageHref,
  getPackageIdFromSlug,
  getPackagePrimaryImage,
  getPackageSlug,
} from '@/lib/packages/presentation';
import type { CareerPackage, CheckoutPricing } from '@/types/domain';

export const dynamic = 'force-dynamic';

interface PackageDetailPageProps {
  params: Promise<{ slug: string }>;
}

const getPackage = cache((id: number) => packagesApi.getById(id));
const getPackageCatalog = cache(() => packagesApi.list({ limit: 100 }));
const getPricing = cache((packageId: number, offerId?: number) =>
  checkoutApi.preview({ packageId, offerId }),
);

async function resolvePackage(slug: string): Promise<CareerPackage> {
  const id = getPackageIdFromSlug(slug);
  if (id === null) notFound();

  try {
    return await getPackage(id);
  } catch (error) {
    if (isApiError(error) && error.kind === 'not-found') notFound();
    throw error;
  }
}

function toAbsoluteUrl(value: string): string | null {
  if (/^https?:\/\//i.test(value)) return value;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return null;

  try {
    return new URL(value, siteUrl).toString();
  } catch {
    return null;
  }
}

async function getOptionalPageData(packageItem: CareerPackage): Promise<{
  pricing: CheckoutPricing | null;
  relatedPackages: CareerPackage[];
}> {
  const bestOffer = getBestPackageOffer(packageItem);
  const [pricingResult, catalogResult] = await Promise.allSettled([
    getPricing(packageItem.id, bestOffer?.id),
    getPackageCatalog(),
  ]);
  const catalog =
    catalogResult.status === 'fulfilled' ? catalogResult.value.items : [];
  const relatedPackages = catalog
    .filter((candidate) => candidate.id !== packageItem.id)
    .sort((first, second) => {
      const firstDistance = Math.abs(first.sortOrder - packageItem.sortOrder);
      const secondDistance = Math.abs(second.sortOrder - packageItem.sortOrder);

      return (
        firstDistance - secondDistance || first.sortOrder - second.sortOrder
      );
    })
    .slice(0, 3);

  return {
    pricing: pricingResult.status === 'fulfilled' ? pricingResult.value : null,
    relatedPackages,
  };
}

export async function generateMetadata({
  params,
}: PackageDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const id = getPackageIdFromSlug(slug);

  if (id === null) notFound();

  let packageItem: CareerPackage;
  try {
    packageItem = await getPackage(id);
  } catch (error) {
    if (isApiError(error) && error.kind === 'not-found') notFound();
    return { title: 'Career Service | SANAD' };
  }

  if (slug !== getPackageSlug(packageItem)) {
    redirect(getPackageHref(packageItem));
  }

  const description =
    packageItem.description ??
    `Review the scope, pricing, delivery estimate, and included revisions for ${packageItem.name}.`;
  const packageHref = getPackageHref(packageItem);
  const canonicalUrl = toAbsoluteUrl(packageHref) ?? packageHref;
  const primaryImage = getPackagePrimaryImage(packageItem);
  const imageUrl = primaryImage
    ? toAbsoluteUrl(primaryImage.url ?? primaryImage.path)
    : null;

  return {
    title: `${packageItem.name} | SANAD Career Services`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      title: `${packageItem.name} | SANAD`,
      description,
      url: canonicalUrl,
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                alt:
                  primaryImage?.altText ??
                  `${packageItem.name} service preview`,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function PackageDetailPage({
  params,
}: PackageDetailPageProps) {
  const { slug } = await params;
  const packageItem = await resolvePackage(slug);

  if (slug !== getPackageSlug(packageItem)) {
    redirect(getPackageHref(packageItem));
  }

  const { pricing, relatedPackages } = await getOptionalPageData(packageItem);
  const content = getPackageDetailContent(packageItem);
  const bestOffer = getBestPackageOffer(packageItem);
  const revisionLabel = `${packageItem.maxRevisions} ${
    packageItem.maxRevisions === 1 ? 'revision' : 'revisions'
  }`;
  const displayPrice = getOrderDisplayPrice(packageItem, pricing);
  const orderMessage = encodeURIComponent(
    `Hello, I am ready to start the ${packageItem.name} (service #${packageItem.id}). The current displayed total is ${displayPrice}. Please confirm the next steps.`,
  );
  const questionMessage = encodeURIComponent(
    `Hello, I have a question about the scope of ${packageItem.name} (service #${packageItem.id}).`,
  );
  const orderHref = `${PUBLIC_WHATSAPP_HREF}?text=${orderMessage}`;
  const askHref = `${PUBLIC_WHATSAPP_HREF}?text=${questionMessage}`;
  const packageHref = getPackageHref(packageItem);
  const canonicalUrl = toAbsoluteUrl(packageHref) ?? packageHref;
  const primaryImage = getPackagePrimaryImage(packageItem);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: packageItem.name,
    description:
      packageItem.description ??
      `Professional career support from SANAD: ${packageItem.name}.`,
    image: primaryImage
      ? (toAbsoluteUrl(primaryImage.url ?? primaryImage.path) ?? undefined)
      : undefined,
    provider: {
      '@type': 'Organization',
      name: 'SANAD',
    },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: pricing?.currency ?? 'AED',
      price: (
        pricing?.finalAmount ?? getPackageCurrentPrice(packageItem)
      ).toFixed(2),
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <div className="package-detail-page pb-24 lg:pb-0">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
        type="application/ld+json"
      />

      <section className="relative overflow-hidden border-b border-primary-foreground/10 bg-primary text-primary-foreground">
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 h-72 w-72 translate-x-1/3 -translate-y-1/3 rounded-full border border-primary-foreground/10"
        />
        <div
          aria-hidden="true"
          className="absolute right-[12%] bottom-[-9rem] size-80 rounded-full bg-accent/10 blur-3xl"
        />

        <div className="layout-container relative py-10 sm:py-14 lg:py-18">
          <nav aria-label="Breadcrumb" className="sanad-detail-enter">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-primary-foreground/70">
              <li>
                <Link
                  className="transition-colors hover:text-primary-foreground"
                  href="/"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-4" />
              </li>
              <li>
                <Link
                  className="transition-colors hover:text-primary-foreground"
                  href="/packages"
                >
                  Services
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-4" />
              </li>
              <li
                aria-current="page"
                className="max-w-52 truncate font-semibold text-primary-foreground sm:max-w-none"
              >
                {packageItem.name}
              </li>
            </ol>
          </nav>

          <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(24rem,1.08fr)] lg:items-center lg:gap-16 xl:gap-20">
            <div className="sanad-detail-enter sanad-detail-enter-delay-1">
              <div className="flex flex-wrap gap-2">
                <Badge className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
                  Career service
                </Badge>
                {bestOffer ? (
                  <Badge className="border-accent/40 bg-accent/15 text-primary-foreground">
                    <Sparkles
                      aria-hidden="true"
                      className="size-3.5 text-accent"
                    />
                    Save {bestOffer.discountPercentage}%
                  </Badge>
                ) : null}
              </div>
              <h1 className="type-h1 mt-5 max-w-[16ch] text-primary-foreground">
                {packageItem.name}
              </h1>
              <p className="mt-6 max-w-[42rem] text-base leading-7 text-primary-foreground/80 sm:text-lg sm:leading-8">
                {packageItem.description ??
                  'A focused service for presenting your professional experience with greater clarity.'}
              </p>

              <dl className="mt-8 grid max-w-xl grid-cols-2 gap-3">
                <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4 backdrop-blur-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-primary-foreground/65 uppercase">
                    <Clock3 aria-hidden="true" className="size-4 text-accent" />
                    Delivery
                  </dt>
                  <dd className="mt-2 font-semibold">
                    {packageItem.deliveryDays} days
                  </dd>
                </div>
                <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4 backdrop-blur-sm">
                  <dt className="flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-primary-foreground/65 uppercase">
                    <RefreshCcw
                      aria-hidden="true"
                      className="size-4 text-accent"
                    />
                    Revisions
                  </dt>
                  <dd className="mt-2 font-semibold">{revisionLabel}</dd>
                </div>
              </dl>
            </div>

            <div className="sanad-detail-enter sanad-detail-enter-delay-2">
              <PackageGallery
                images={packageItem.images}
                packageName={packageItem.name}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background" id="service-details">
        <div className="layout-container layout-section">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-16 xl:gap-20">
            <div className="min-w-0">
              <section aria-labelledby="best-for-heading">
                <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
                  <span aria-hidden="true" className="h-px w-8 bg-accent" />
                  Package fit
                </p>
                <div className="mt-5 rounded-lg border border-border bg-surface-muted p-6 sm:p-8">
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
                    >
                      <Target className="size-5" />
                    </span>
                    <div>
                      <h2
                        className="type-h3 text-primary"
                        id="best-for-heading"
                      >
                        Who this service is for
                      </h2>
                      <p className="mt-3 text-base leading-7 text-muted-foreground">
                        {content.bestFor}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section
                aria-labelledby="included-heading"
                className="mt-14 scroll-mt-24"
              >
                <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
                  Deliverables
                </p>
                <h2 className="type-h2 mt-3 text-primary" id="included-heading">
                  What&rsquo;s Included
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                  Every item below is part of the published scope for this
                  service.
                </p>

                {packageItem.features.length > 0 ? (
                  <ul className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-x-8">
                    {packageItem.features.map((feature) => (
                      <li
                        className="flex items-start gap-3 border-b border-border/70 pb-4 text-sm leading-6 text-foreground"
                        key={feature}
                      >
                        <span
                          aria-hidden="true"
                          className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-muted text-secondary"
                        >
                          <Check className="size-4" strokeWidth={2.2} />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-8 rounded-lg border border-border bg-surface-muted p-6">
                    <p className="text-sm leading-6 text-muted-foreground">
                      The detailed deliverables for this service are confirmed
                      with SANAD before the order begins.
                    </p>
                  </div>
                )}
              </section>

              <section
                aria-labelledby="preparation-heading"
                className="mt-14 border-t border-border pt-14"
              >
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="grid size-11 shrink-0 place-items-center rounded-md bg-surface-muted text-primary"
                  >
                    <ListChecks className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      className="type-h3 text-primary"
                      id="preparation-heading"
                    >
                      What to prepare
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Having these details ready helps SANAD confirm the scope
                      and begin efficiently.
                    </p>
                  </div>
                </div>
                <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                  {content.preparation.map((item) => (
                    <li
                      className="flex items-start gap-3 rounded-md border border-border bg-surface p-4 text-sm leading-6"
                      key={item}
                    >
                      <CircleCheckBig
                        aria-hidden="true"
                        className="mt-1 size-4 shrink-0 text-accent"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section
                aria-labelledby="process-heading"
                className="mt-14 border-t border-border pt-14"
              >
                <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
                  Simple process
                </p>
                <h2 className="type-h2 mt-3 text-primary" id="process-heading">
                  How the service works
                </h2>
                <ol className="mt-8 grid gap-4 md:grid-cols-3">
                  {content.process.map((step, index) => (
                    <li
                      className="relative rounded-lg border border-border bg-surface p-5 shadow-xs"
                      key={step.title}
                    >
                      <span className="font-display text-3xl text-accent/80">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="mt-5 font-semibold text-primary">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {step.description}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              {content.importantNote ? (
                <div className="mt-10 flex items-start gap-4 rounded-lg border border-warning/30 bg-warning/5 p-5">
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-warning"
                  />
                  <div>
                    <h2 className="font-semibold text-primary">
                      Important before you continue
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {content.importantNote}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="lg:sticky lg:top-6">
              <PackageOrderCard
                askHref={askHref}
                orderHref={orderHref}
                packageItem={packageItem}
                pricing={pricing}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface-muted">
        <div className="layout-container py-14 sm:py-18">
          <div className="grid gap-10 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)] lg:gap-16">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
                Before you order
              </p>
              <h2 className="type-h2 mt-3 text-primary">
                Frequently asked questions
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                Clear answers about starting the service, revisions, and the
                outcome you can expect.
              </p>
            </div>
            <Accordion
              className="border-t border-border"
              collapsible
              type="single"
            >
              {content.faqs.map((item, index) => (
                <AccordionItem key={item.question} value={`faq-${index}`}>
                  <AccordionTrigger className="py-5 text-base text-primary">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="max-w-2xl pb-5 text-sm leading-7">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {relatedPackages.length > 0 ? (
        <section className="bg-background">
          <div className="layout-container layout-section">
            <div className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
                  Compare your options
                </p>
                <h2 className="type-h2 mt-3 text-primary">
                  Similar career services
                </h2>
              </div>
              <Button asChild variant="outline">
                <Link href="/packages">
                  View All Services
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {relatedPackages.map((relatedPackage) => (
                <PackageRelatedCard
                  key={relatedPackage.id}
                  packageItem={relatedPackage}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-border bg-surface-muted">
        <div className="layout-container py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
              >
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h2 className="type-h4 text-primary">A clear, honest scope</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  SANAD provides professional career-document services. These
                  services can strengthen how your experience is presented, but
                  they cannot guarantee interviews, offers, or employment.
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/packages">
                <ArrowLeft aria-hidden="true" className="size-4" />
                Compare All Services
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="layout-container py-12 sm:py-16">
          <div className="relative overflow-hidden rounded-xl border border-border bg-primary px-6 py-9 text-primary-foreground sm:px-9 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div
              aria-hidden="true"
              className="sanad-cta-glow absolute -top-20 -right-16 size-64 rounded-full bg-accent/15 blur-3xl"
            />
            <div className="relative flex items-start gap-4">
              <MessageCircle
                aria-hidden="true"
                className="mt-1 size-6 shrink-0 text-accent"
              />
              <div>
                <h2 className="type-h3 text-primary-foreground">
                  Ready to discuss {packageItem.name}?
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/75 sm:text-base">
                  Start the order or ask a focused question about the scope
                  before you continue.
                </p>
              </div>
            </div>
            <div className="relative mt-7 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
              <Button
                asChild
                className="border-accent bg-accent text-accent-foreground hover:bg-[color:var(--sanad-champagne)]"
                size="lg"
              >
                <Link
                  href={orderHref}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Start Your Order
                  <FileCheck2 aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:border-accent hover:bg-primary-foreground/10"
                size="lg"
                variant="outline"
              >
                <Link href={askHref} rel="noreferrer noopener" target="_blank">
                  Ask a Question
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-8px_24px_rgb(11_39_68_/_0.1)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-muted-foreground">
              {packageItem.name}
            </p>
            <p className="mt-0.5 font-display text-xl leading-none text-primary">
              {displayPrice}
            </p>
          </div>
          <Button asChild className="group shrink-0" size="lg">
            <Link href={orderHref} rel="noreferrer noopener" target="_blank">
              Start Order
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5"
              />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
