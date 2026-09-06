import { ArrowRight, FileText, Clock3, RefreshCcw, Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { PackagePrice } from '@/components/packages/package-price';
import { PackageSocialProof } from '@/components/packages/package-social-proof';
import { Badge } from '@/components/ui/badge';
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
  getPackageShortDescription,
  getPackageShortTitle,
} from '@/lib/packages/presentation';
import type { CareerPackage } from '@/types/domain';

interface PackageCardProps {
  categoryLabel?: string;
  index: number;
  packageItem: CareerPackage;
  shortTitle?: string;
}

export function PackageCard({
  categoryLabel = 'Career service',
  index,
  packageItem,
  shortTitle: providedShortTitle,
}: PackageCardProps) {
  const primaryImage = getPackagePrimaryImage(packageItem);
  const shortTitle = providedShortTitle ?? getPackageShortTitle(packageItem);

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border/90 shadow-xs transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-standard)] hover:-translate-y-1 hover:border-accent/70 hover:shadow-md focus-within:border-accent/70 focus-within:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
      <Link
        href={getPackageHref(packageItem)}
        aria-label={`View ${packageItem.name}`}
        className="relative block aspect-[16/10] overflow-hidden border-b border-border/70 bg-surface-muted"
      >
        {primaryImage ? (
          <Image
            alt={
              primaryImage.altText ??
              `Professional presentation for ${packageItem.name}`
            }
            className="object-cover transition-transform duration-500 ease-[var(--ease-standard)] motion-safe:group-hover:scale-[1.04] motion-reduce:transition-none"
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
          className="absolute inset-x-0 bottom-0 h-1 bg-accent"
        />
      </Link>

      <CardHeader className="gap-0 pb-5">
        <div className="flex items-center justify-between gap-4">
          <Badge className="tracking-[0.06em] uppercase" variant="secondary">
            {categoryLabel}
          </Badge>
          <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <CardTitle
          as="h3"
          className="mt-5 text-primary transition-colors duration-200 group-hover:text-secondary"
        >
          <Link
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={getPackageHref(packageItem)}
          >
            {shortTitle}
          </Link>
        </CardTitle>
        <CardDescription className="mt-3 line-clamp-2 min-h-12 text-base leading-6">
          {getPackageShortDescription(packageItem)}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col border-t border-border/70 pt-5">
        <ul className="mb-5 grid gap-2 text-sm text-foreground">
          {packageItem.features.slice(0, 3).map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check
                className="mt-0.5 size-4 shrink-0 text-secondary"
                aria-hidden="true"
              />
              <span>{feature}</span>
            </li>
          ))}
          {packageItem.features.length > 3 ? (
            <li className="text-muted-foreground">
              +{packageItem.features.length - 3} more included
            </li>
          ) : null}
        </ul>
        <div className="mb-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-4" aria-hidden="true" />
            {packageItem.deliveryDays} days estimated
          </span>
          <span className="inline-flex items-center gap-1.5">
            <RefreshCcw className="size-4" aria-hidden="true" />
            {packageItem.maxRevisions}{' '}
            {packageItem.maxRevisions === 1 ? 'revision' : 'revisions'}
          </span>
        </div>
        <div className="mt-auto">
          <PackagePrice packageItem={packageItem} />
        </div>
        <PackageSocialProof
          className="mt-5 border-t border-border/70 pt-4"
          packageItem={packageItem}
        />
      </CardContent>

      <CardFooter className="mt-auto">
        <Button asChild className="group/button w-full" size="lg">
          <Link
            aria-label={`Explore ${packageItem.name}`}
            href={getPackageHref(packageItem)}
          >
            Explore service
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
