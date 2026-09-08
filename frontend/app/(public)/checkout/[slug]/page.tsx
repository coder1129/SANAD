import { getLocalizedMetadata } from '@/lib/i18n/metadata';

import { getCopy } from '@/lib/i18n/server-copy';
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
  const _copy = await getCopy();
  const { slug } = await params;
  const packageItem = await resolvePackage(slug);
  const localizedName = _copy(packageItem.name, packageItem.nameAr);
  return await getLocalizedMetadata({
    title: _copy(
      `Checkout | ${packageItem.name} | SANAD`,
      `إتمام الطلب | ${localizedName} | سند`,
    ),
    description: _copy(
      `Complete your secure order for ${packageItem.name}.`,
      `أكمل طلبك الآمن لخدمة ${localizedName}.`,
    ),
    robots: { index: false, follow: false },
  });
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const _copy = await getCopy();

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
            aria-label={_copy('Breadcrumb')}
            className="text-sm text-muted-foreground"
          >
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link className="hover:text-primary" href="/">
                  {_copy('Home')}
                </Link>
              </li>
              <li aria-hidden="true">{_copy('/')}</li>
              <li>
                <Link className="hover:text-primary" href="/packages">
                  {_copy('Services')}
                </Link>
              </li>
              <li aria-hidden="true">{_copy('/')}</li>
              <li>
                <Link
                  className="max-w-52 truncate hover:text-primary"
                  href={getPackageHref(packageItem)}
                >
                  {_copy(packageItem.name, packageItem.nameAr)}
                </Link>
              </li>
              <li aria-hidden="true">{_copy('/')}</li>
              <li aria-current="page" className="font-semibold text-primary">
                {_copy('Checkout')}
              </li>
            </ol>
          </nav>
          <p className="mt-8 text-xs font-semibold tracking-[0.18em] text-secondary uppercase">
            {_copy('Secure checkout')}
          </p>
          <h1 className="type-h1 mt-3 max-w-3xl text-primary">
            {_copy('Complete your')}
            {_copy(packageItem.name, packageItem.nameAr)} {_copy('order')}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {_copy(
              'Add the context we need, review the final total, and continue to secure payment.',
            )}
          </p>
        </div>
      </section>
      <section className="layout-container py-10 sm:py-14 lg:py-18">
        <CheckoutExperience packageItem={packageItem} pricing={pricing} />
      </section>
    </div>
  );
}
