import { Star, UsersRound } from 'lucide-react';

import { StarRating } from '@/components/feedback/star-rating';
import { cn } from '@/lib/utils/cn';
import type { CareerPackage } from '@/types/domain';

interface PackageSocialProofProps {
  className?: string;
  packageItem: CareerPackage;
}

export function PackageSocialProof({
  className,
  packageItem,
}: PackageSocialProofProps) {
  const hasRating =
    packageItem.ratingAverage !== null && packageItem.ratingCount > 0;

  return (
    <div
      className={cn(
        'flex min-h-6 flex-wrap items-center gap-x-5 gap-y-2 text-sm',
        className,
      )}
    >
      {hasRating ? (
        <span className="inline-flex items-center gap-2 text-foreground">
          <StarRating rating={packageItem.ratingAverage ?? 0} size="sm" />
          <strong className="font-semibold text-primary">
            {packageItem.ratingAverage?.toFixed(1)}
          </strong>
          <span className="text-muted-foreground">
            ({packageItem.ratingCount}{' '}
            {packageItem.ratingCount === 1 ? 'review' : 'reviews'})
          </span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <Star aria-hidden="true" className="size-4" />
          No reviews yet
        </span>
      )}

      {packageItem.buyerCount > 0 ? (
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <UsersRound aria-hidden="true" className="size-4 text-secondary" />
          {packageItem.buyerCount.toLocaleString('en')} confirmed{' '}
          {packageItem.buyerCount === 1 ? 'buyer' : 'buyers'}
        </span>
      ) : null}
    </div>
  );
}
