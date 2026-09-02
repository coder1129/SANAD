import { BriefcaseBusiness, Check, ChevronRight, Scale } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PackageCard } from '@/components/packages/package-card';
import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { packagesApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Career Services & Packages | SANAD',
  description:
    'Compare SANAD career-service packages, pricing, included deliverables, delivery estimates, and revision allowances.',
};

const comparisonPoints = [
  'Clear service scope and included deliverables',
  'Current pricing and active offers',
  'Delivery estimates and revision allowances',
] as const;

export default async function PackagesPage() {
  const { items, meta } = await packagesApi.list({ limit: 100 });
  const packages = [...items].sort(
    (first, second) => first.sortOrder - second.sortOrder,
  );

  return (
    <>
      <section className="border-b border-border bg-surface-muted">
        <div className="layout-container py-12 sm:py-16 lg:py-20">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <li>
                <Link className="transition-colors hover:text-primary" href="/">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-4" />
              </li>
              <li aria-current="page" className="font-semibold text-primary">
                Services
              </li>
            </ol>
          </nav>

          <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:items-end lg:gap-16">
            <div>
              <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
                <span aria-hidden="true" className="h-px w-8 bg-accent" />
                Career services
              </p>
              <h1 className="type-h1 mt-5 max-w-[18ch] text-primary">
                Choose the support that fits your next professional move.
              </h1>
              <p className="mt-6 max-w-[42rem] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Compare each service by scope, price, delivery estimate, and
                included revisions before deciding what you need.
              </p>
            </div>

            <div className="border-t border-border pt-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
              <p className="type-label text-primary">What you can compare</p>
              <ul className="mt-4 grid gap-3">
                {comparisonPoints.map((point) => (
                  <li
                    className="flex items-start gap-3 text-sm leading-6 text-foreground"
                    key={point}
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-1 size-4 shrink-0 text-accent"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="packages-catalog-heading"
        className="bg-background"
      >
        <div className="layout-container layout-section">
          <div className="flex flex-col gap-3 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
                Available now
              </p>
              <h2
                className="type-h2 mt-3 text-primary"
                id="packages-catalog-heading"
              >
                Compare Career Services
              </h2>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              {meta.total} {meta.total === 1 ? 'service' : 'services'} available
            </p>
          </div>

          {packages.length > 0 ? (
            <ul className="mt-10 grid items-stretch gap-6 md:grid-cols-2 lg:mt-12 lg:grid-cols-3">
              {packages.map((packageItem, index) => (
                <li key={packageItem.id}>
                  <PackageCard index={index} packageItem={packageItem} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              action={
                <Button asChild>
                  <Link href="/">Return Home</Link>
                </Button>
              }
              className="mt-10"
              description="There are no published services to compare at the moment."
              icon={<BriefcaseBusiness />}
              title="No services are currently available"
            />
          )}
        </div>
      </section>

      <section className="border-y border-border bg-surface-muted">
        <div className="layout-container py-12 sm:py-14">
          <div className="grid gap-7 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-8">
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-md bg-primary text-primary-foreground"
            >
              <Scale className="size-5" />
            </span>
            <div>
              <h2 className="type-h4 text-primary">Need help comparing?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Review the common questions about choosing a service, sharing
                your information, and receiving completed documents.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/#faq">Read the FAQ</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
