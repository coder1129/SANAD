import { ArrowRight, Check, Clock3, FileText, RefreshCcw } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { PackagePrice } from '@/components/packages/package-price';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getPackageHref,
  getPackagePrimaryImage,
} from '@/lib/packages/presentation';
import type { CareerPackage } from '@/types/domain';

interface PackageCardProps {
  index: number;
  packageItem: CareerPackage;
}

export function PackageCard({ index, packageItem }: PackageCardProps) {
  const visibleFeatures = packageItem.features.slice(0, 5);
  const primaryImage = getPackagePrimaryImage(packageItem);
  const remainingFeatures =
    packageItem.features.length - visibleFeatures.length;
  const revisionLabel = `${packageItem.maxRevisions} ${
    packageItem.maxRevisions === 1 ? 'revision' : 'revisions'
  }`;

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-t-2 border-t-accent shadow-xs transition-[transform,box-shadow] duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:shadow-md focus-within:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-border/70 bg-surface-muted">
        {primaryImage ? (
          <Image
            alt={
              primaryImage.altText ??
              `Professional presentation for ${packageItem.name}`
            }
            className="object-cover transition-transform duration-300 ease-[var(--ease-standard)] motion-safe:group-hover:scale-[1.015] motion-reduce:transition-none"
            fill
            sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1023px) 50vw, 33vw"
            src={primaryImage.url ?? primaryImage.path}
          />
        ) : (
          <div
            aria-label="Career service document preview"
            className="grid h-full place-items-center text-secondary"
            role="img"
          >
            <FileText
              aria-hidden="true"
              className="size-12"
              strokeWidth={1.25}
            />
          </div>
        )}
        <span
          aria-hidden="true"
          className="absolute right-0 bottom-0 h-1 w-1/3 bg-accent"
        />
      </div>

      <CardHeader className="border-b border-border/70">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
            Service {String(index + 1).padStart(2, '0')}
          </p>
          <span
            aria-hidden="true"
            className="font-display text-2xl text-accent/70"
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <CardTitle as="h2" className="mt-5 text-primary">
          {packageItem.name}
        </CardTitle>
        <CardDescription className="mt-2 text-base leading-7">
          {packageItem.description ??
            'A focused career service with a clearly defined scope.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-6">
        <PackagePrice packageItem={packageItem} />

        <dl className="mt-6 grid grid-cols-2 gap-3 border-y border-border/70 py-4">
          <div>
            <dt className="flex items-center gap-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              <Clock3 aria-hidden="true" className="size-4 text-accent" />
              Delivery
            </dt>
            <dd className="mt-1.5 text-sm font-semibold text-primary">
              {packageItem.deliveryDays} days
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              <RefreshCcw aria-hidden="true" className="size-4 text-accent" />
              Included
            </dt>
            <dd className="mt-1.5 text-sm font-semibold text-primary">
              {revisionLabel}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <p className="type-label text-primary">What is included</p>
          <ul className="mt-4 grid gap-3">
            {visibleFeatures.map((feature) => (
              <li
                className="flex items-start gap-3 text-sm leading-6 text-foreground"
                key={feature}
              >
                <Check
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-accent"
                  strokeWidth={2}
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          {remainingFeatures > 0 ? (
            <p className="mt-3 text-sm font-semibold text-secondary">
              +{remainingFeatures} more included
            </p>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="mt-auto">
        <Button asChild className="group/button w-full" size="lg">
          <Link
            aria-label={`View details for ${packageItem.name}`}
            href={getPackageHref(packageItem)}
          >
            View Details
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 motion-safe:group-hover/button:translate-x-0.5 motion-safe:group-focus-visible/button:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
