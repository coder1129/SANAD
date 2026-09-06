import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDown, ArrowRight, MessageCircle } from 'lucide-react';
import { ServicesCatalog } from '@/components/packages/services-catalog';
import { getServiceCategory } from '@/lib/packages/categories';
import { PackageComparison } from '@/components/packages/package-comparison';
import { Button } from '@/components/ui/button';
import { packagesApi, settingsApi } from '@/lib/api';
import { whatsappHref } from '@/lib/orders/presentation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Career Services | SANAD',
  description:
    'Compare CV writing, LinkedIn optimization, application support and complete career packages by scope, price, delivery and revisions.',
  alternates: { canonical: '/packages' },
};

export default async function PackagesPage() {
  const [catalog, settingsResult] = await Promise.all([
    packagesApi.list({ limit: 100 }),
    settingsApi.getPublic().catch(() => null),
  ]);
  const packages = [...catalog.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const hasComparison =
    packages.filter((item) => getServiceCategory(item) === 'bundles').length >=
    2;
  const contact = whatsappHref(
    settingsResult?.whatsapp_number,
    'Hello, I would like help comparing SANAD services and confirming the scope before ordering.',
  );
  return (
    <>
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="layout-container py-7 sm:py-10">
          <nav aria-label="Breadcrumb" className="text-sm">
            <Link className="underline underline-offset-4" href="/">
              Home
            </Link>
            <span aria-hidden="true" className="mx-3">
              /
            </span>
            <span aria-current="page">Services</span>
          </nav>
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-accent">
                SANAD career services
              </p>
              <h1 className="type-h2 mt-3 text-primary-foreground">
                Choose your next career step.
              </h1>
              <p className="mt-4 leading-7 text-primary-foreground/80">
                Compare focused services and complete packages. See what you
                receive, the price and the delivery estimate before you choose.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Link href="#services-catalog">
                  Explore services
                  <ArrowDown aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              {hasComparison ? (
                <Link
                  className="inline-flex min-h-11 items-center px-3 font-semibold underline underline-offset-4"
                  href="#compare-packages"
                >
                  Compare packages
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      <ServicesCatalog packages={packages} />
      <PackageComparison packages={packages} />
      <section className="bg-surface" aria-labelledby="next-steps-heading">
        <div className="layout-container layout-section">
          <h2 id="next-steps-heading" className="type-h3 text-primary">
            From choosing a service to receiving your work
          </h2>
          <ol className="mt-7 grid gap-6 md:grid-cols-3">
            {[
              [
                'Choose your scope',
                'Review the deliverables, total and revision allowance.',
              ],
              [
                'Share your background',
                'After order confirmation, use WhatsApp to share the information needed to begin.',
              ],
              [
                'Review your delivery',
                'Review the work and request changes within the agreed scope.',
              ],
            ].map(([title, description], index) => (
              <li key={title} className="border-t-2 border-accent pt-4">
                <span className="text-sm font-semibold text-secondary">
                  0{index + 1}
                </span>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-col gap-5 rounded-lg border border-border bg-surface-muted p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-primary">
                Not sure which service fits?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Confirm the scope and timeline with SANAD before ordering.
              </p>
            </div>
            <Button asChild variant="outline">
              {contact ? (
                <a href={contact} target="_blank" rel="noopener noreferrer">
                  Ask about a service
                  <MessageCircle className="size-4" aria-hidden="true" />
                </a>
              ) : (
                <Link href="/faq">
                  Read the FAQ
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              )}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
