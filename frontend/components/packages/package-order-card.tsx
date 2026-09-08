import { useCopy } from '@/lib/i18n/use-copy';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import Link from 'next/link';

import { PackagePrice } from '@/components/packages/package-price';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getBestPackageOffer,
  getPackageCurrentPrice,
} from '@/lib/packages/presentation';
import type { CareerPackage, CheckoutPricing } from '@/types/domain';
import { formatMoney } from '@/lib/orders/presentation';

interface PackageOrderCardProps {
  checkoutHref: string;
  packageItem: CareerPackage;
  pricing: CheckoutPricing | null;
}

export function PackageOrderCard({
  checkoutHref,
  packageItem,
  pricing,
}: PackageOrderCardProps) {
  const _copy = useCopy();

  const bestOffer = getBestPackageOffer(packageItem);
  const revisions = `${packageItem.maxRevisions} ${
    packageItem.maxRevisions === 1 ? 'revision' : 'revisions'
  }`;

  return (
    <aside
      aria-label={_copy('Order summary')}
      className="overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-md"
    >
      <div className="border-b border-border bg-surface-muted px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-secondary uppercase">
            {_copy('Order summary')}
          </p>
          <ShieldCheck aria-hidden="true" className="size-5 text-accent" />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-primary">
          {_copy(packageItem.name, packageItem.nameAr)}
        </h2>
      </div>

      <div className="p-6">
        {pricing ? (
          <>
            {pricing.offerDiscountPercentage > 0 ? (
              <Badge className="mb-4" variant="warning">
                <Tag aria-hidden="true" className="size-3.5" />
                {_copy(
                  bestOffer?.name ?? 'Active offer',
                  bestOffer?.nameAr,
                )}{' '}
                {_copy('·')}
                {_copy(' ')}
                {_copy(pricing.offerDiscountPercentage)}
                {_copy('% off')}
              </Badge>
            ) : null}
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {_copy('Total')}
            </p>
            <p className="mt-2 font-display text-4xl leading-none text-primary">
              {_copy(_copy.money(pricing.finalAmount, pricing.currency))}
            </p>

            <dl className="mt-6 grid gap-3 border-y border-border py-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">
                  {_copy('Original price')}
                </dt>
                <dd className="font-semibold text-foreground">
                  {_copy(_copy.money(pricing.originalPrice, pricing.currency))}
                </dd>
              </div>
              {pricing.offerDiscountAmount > 0 ? (
                <div className="flex items-center justify-between gap-4 text-success">
                  <dt>{_copy('Offer saving')}</dt>
                  <dd className="font-semibold">
                    {_copy('−')}
                    {_copy(
                      _copy.money(
                        pricing.offerDiscountAmount,
                        pricing.currency,
                      ),
                    )}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{_copy('Subtotal')}</dt>
                <dd className="font-semibold text-foreground">
                  {_copy(
                    _copy.money(
                      pricing.subtotalAfterDiscounts,
                      pricing.currency,
                    ),
                  )}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <PackagePrice packageItem={packageItem} size="hero" />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {_copy(
                'The final tax and total are confirmed when your order is started.',
              )}
            </p>
          </>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <dt className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
              <Clock3 aria-hidden="true" className="size-4 text-accent" />
              {_copy('Delivery')}
            </dt>
            <dd className="mt-2 text-sm font-semibold text-primary">
              {_copy(packageItem.deliveryDays)} {_copy('days estimated')}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
              <RefreshCcw aria-hidden="true" className="size-4 text-accent" />
              {_copy('Included')}
            </dt>
            <dd className="mt-2 text-sm font-semibold text-primary">
              {_copy(revisions)}
            </dd>
          </div>
        </dl>

        <Button asChild className="group mt-6 w-full" size="lg">
          <Link href={checkoutHref}>
            {_copy('Continue to checkout')}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </Button>
        <Button asChild className="mt-3 w-full" size="lg" variant="outline">
          <Link href="#included-heading">
            {_copy('Review the service scope')}
          </Link>
        </Button>

        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-success"
          />
          {_copy(
            'Review your order before confirming. After confirmation, continue on WhatsApp to share your requirements with SANAD.',
          )}
        </p>
      </div>
    </aside>
  );
}

export function getOrderDisplayPrice(
  packageItem: CareerPackage,
  pricing: CheckoutPricing | null,
  locale = 'en',
): string {
  return pricing
    ? formatMoney(pricing.finalAmount, pricing.currency, locale)
    : formatMoney(getPackageCurrentPrice(packageItem), 'AED', locale);
}
