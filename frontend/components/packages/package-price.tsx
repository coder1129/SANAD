import { useCopy } from '@/lib/i18n/use-copy';
import { Badge } from '@/components/ui/badge';
import {
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
  const _copy = useCopy();

  const offer = getBestPackageOffer(packageItem);
  const currentPrice = getPackageCurrentPrice(packageItem);

  return (
    <div className={className}>
      {offer ? (
        <Badge className="mb-3" variant="warning">
          {_copy(offer.name)} {_copy('·')}
          {_copy(offer.discountPercentage)}
          {_copy('% off')}
        </Badge>
      ) : null}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p
          className={cn(
            'font-display leading-none text-primary',
            size === 'hero' ? 'text-4xl sm:text-5xl' : 'text-3xl',
          )}
        >
          <span className="sr-only">{_copy('Current price:')}</span>
          {_copy(_copy.money(currentPrice))}
        </p>

        {offer ? (
          <p className="text-sm text-muted-foreground line-through">
            <span className="sr-only">{_copy('Original price:')}</span>
            {_copy(_copy.money(packageItem.price))}
          </p>
        ) : null}
      </div>
    </div>
  );
}
