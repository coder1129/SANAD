import type { CareerPackage, PackageImage, PackageOffer } from '@/types/domain';

const PRICE_FORMATTER = new Intl.NumberFormat('en-AE', {
  style: 'currency',
  currency: 'AED',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function getPackageSlug(packageItem: CareerPackage): string {
  const name = slugify(packageItem.name) || 'career-service';
  return `${name}-${packageItem.id}`;
}

export function getPackageHref(packageItem: CareerPackage): string {
  return `/packages/${getPackageSlug(packageItem)}`;
}

export function getPackagePrimaryImage(
  packageItem: CareerPackage,
): PackageImage | null {
  if (packageItem.images.length === 0) return null;

  return [...packageItem.images].sort((first, second) => {
    if (first.isPrimary !== second.isPrimary) return first.isPrimary ? -1 : 1;
    return first.displayOrder - second.displayOrder;
  })[0];
}

export function getPackageIdFromSlug(slug: string): number | null {
  const match = slug.match(/(?:^|-)(\d+)$/);
  if (!match) return null;

  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function formatPackagePrice(value: number): string {
  return PRICE_FORMATTER.format(value);
}

export function getBestPackageOffer(
  packageItem: CareerPackage,
): PackageOffer | null {
  return packageItem.offers.reduce<PackageOffer | null>(
    (best, offer) =>
      best === null || offer.discountPercentage > best.discountPercentage
        ? offer
        : best,
    null,
  );
}

export function getPackageCurrentPrice(packageItem: CareerPackage): number {
  const offer = getBestPackageOffer(packageItem);
  if (offer === null) return packageItem.price;

  return packageItem.price * (1 - offer.discountPercentage / 100);
}
