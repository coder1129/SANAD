import { Badge } from '@/components/ui/badge';
import {
  formatPackagePrice,
  getBestPackageOffer,
  getPackageCurrentPrice,
} from '@/lib/packages/presentation';
import { cn } from '@/lib/utils/cn';
import type { CareerPackage } from '@/types/domain';

interface PackagePriceProps {
  className?: string;
  packageItem: CareerPackage;
  size?: 'card' | 'hero';
}

export function PackagePrice({
  className,
  packageItem,
  size = 'card',
}: PackagePriceProps) {
  const offer = getBestPackageOffer(packageItem);
  const currentPrice = getPackageCurrentPrice(packageItem);

  return (
    <div className={className}>
      {offer ? (
        <Badge className="mb-3" variant="warning">
          {offer.name} · {offer.discountPercentage}% off
        </Badge>
      ) : null}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p
          className={cn(
            'font-display leading-none text-primary',
            size === 'hero' ? 'text-4xl sm:text-5xl' : 'text-3xl',
          )}
        >
          <span className="sr-only">Current price: </span>
          {formatPackagePrice(currentPrice)}
        </p>

        {offer ? (
          <p className="text-sm text-muted-foreground line-through">
            <span className="sr-only">Original price: </span>
            {formatPackagePrice(packageItem.price)}
          </p>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Final total shown at checkout
      </p>
    </div>
  );
}
