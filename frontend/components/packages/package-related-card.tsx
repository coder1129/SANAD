import { ArrowRight, Check, Clock3 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { PackagePrice } from '@/components/packages/package-price';
import {
  getPackageHref,
  getPackagePrimaryImage,
} from '@/lib/packages/presentation';
import type { CareerPackage } from '@/types/domain';

interface PackageRelatedCardProps {
  packageItem: CareerPackage;
}

export function PackageRelatedCard({ packageItem }: PackageRelatedCardProps) {
  const image = getPackagePrimaryImage(packageItem);
  const firstFeature = packageItem.features[0];

  return (
    <Link
      className="group grid overflow-hidden rounded-lg border border-border bg-surface shadow-xs transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-md focus-visible:border-accent motion-reduce:transform-none motion-reduce:transition-none"
      href={getPackageHref(packageItem)}
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b border-border bg-surface-muted">
        {image ? (
          <Image
            alt={image.altText ?? `${packageItem.name} service preview`}
            className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.015] motion-reduce:transition-none"
            fill
            sizes="(max-width: 767px) calc(100vw - 2rem), 33vw"
            src={image.url ?? image.path}
          />
        ) : (
          <div className="grid h-full place-items-center text-primary">
            <Check aria-hidden="true" className="size-10" strokeWidth={1.25} />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <Clock3 aria-hidden="true" className="size-3.5 text-accent" />
            {packageItem.deliveryDays} days
          </span>
          <ArrowRight
            aria-hidden="true"
            className="size-4 text-primary transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-primary">
          {packageItem.name}
        </h3>
        {firstFeature ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Includes {firstFeature.toLowerCase()}
            {packageItem.features.length > 1
              ? ` and ${packageItem.features.length - 1} more`
              : ''}
            .
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Review the complete service scope.
          </p>
        )}
        <PackagePrice className="mt-5" packageItem={packageItem} />
      </div>
    </Link>
  );
}
