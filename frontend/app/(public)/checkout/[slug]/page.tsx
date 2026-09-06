import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

import { CheckoutExperience } from '@/components/checkout/checkout-experience';
import { checkoutApi, isApiError, packagesApi } from '@/lib/api';
import {
  getBestPackageOffer,
  getPackageHref,
  getPackageIdFromSlug,
  getPackageSlug,
} from '@/lib/packages/presentation';

export const dynamic = 'force-dynamic';

interface CheckoutPageProps {
  params: Promise<{ slug: string }>;
}

const getPackage = cache((id: number) => packagesApi.getById(id));

async function resolvePackage(slug: string) {
  const id = getPackageIdFromSlug(slug);
  if (id === null) notFound();

  try {
    return await getPackage(id);
  } catch (error) {
    if (isApiError(error) && error.kind === 'not-found') notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: CheckoutPageProps): Promise<Metadata> {
  const { slug } = await params;
  const packageItem = await resolvePackage(slug);
  return {
    title: `Checkout | ${packageItem.name} | SANAD`,
    description: `Complete your secure order for ${packageItem.name}.`,
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;
  const packageItem = await resolvePackage(slug);

  if (slug !== getPackageSlug(packageItem)) {
    redirect(`/checkout/${getPackageSlug(packageItem)}`);
  }

  const offer = getBestPackageOffer(packageItem);
  const pricing = await checkoutApi.preview({
    packageId: packageItem.id,
    offerId: offer?.id,
  });

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-surface-muted">
        <div className="layout-container py-10 sm:py-14">
          <nav
            aria-label="Breadcrumb"
            className="text-sm text-muted-foreground"
          >
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link className="hover:text-primary" href="/">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link className="hover:text-primary" href="/packages">
                  Services
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  className="max-w-52 truncate hover:text-primary"
                  href={getPackageHref(packageItem)}
                >
                  {packageItem.name}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-semibold text-primary">
                Checkout
              </li>
            </ol>
          </nav>
          <p className="mt-8 text-xs font-semibold tracking-[0.18em] text-secondary uppercase">
            Secure checkout
          </p>
          <h1 className="type-h1 mt-3 max-w-3xl text-primary">
            Complete your {packageItem.name} order
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Add the context we need, review the final total, and continue to
            secure payment.
          </p>
        </div>
      </section>
      <section className="layout-container py-10 sm:py-14 lg:py-18">
        <CheckoutExperience packageItem={packageItem} pricing={pricing} />
      </section>
    </div>
  );
}
