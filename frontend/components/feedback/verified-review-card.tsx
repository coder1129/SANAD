import { useCopy } from '@/lib/i18n/use-copy';
import { BadgeCheck, Quote } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StarRating } from './star-rating';
import type { PackageReview } from '@/types/domain';

export function VerifiedReviewCard({ review }: { review: PackageReview }) {
  const _copy = useCopy();

  const name = review.customerDisplayName ?? _copy('SANAD Customer');
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
  return (
    <Card className="flex h-full flex-col border-border/90 shadow-xs">
      <CardHeader className="gap-4 border-b border-border/70">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-10 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {_copy(initials)}
          </span>
          <Quote aria-hidden="true" className="size-6 text-accent/70" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StarRating rating={review.rating} />
          {review.packageName ? (
            <span className="text-xs font-semibold text-secondary">
              {_copy(review.packageName, review.packageNameAr)}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-5">
        <p className="text-base leading-7">{review.comment}</p>
        <div className="mt-auto pt-7">
          <p className="font-semibold text-primary">{name}</p>
          {review.verifiedCustomer ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-success">
              <BadgeCheck className="size-4" aria-hidden="true" />
              {_copy('Verified Customer')}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
