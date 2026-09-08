import { useCopy } from '@/lib/i18n/use-copy';
import { Star } from 'lucide-react';

import { StarRating } from './star-rating';

interface FeedbackSummaryProps {
  count: number;
  rating: number;
}

export function FeedbackSummary({ count, rating }: FeedbackSummaryProps) {
  const _copy = useCopy();

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
      <span className="grid size-11 place-items-center rounded-md bg-accent/15 text-secondary">
        <Star aria-hidden="true" className="size-5" fill="currentColor" />
      </span>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-xl text-primary">
            {_copy(rating.toFixed(1))}
          </strong>
          <StarRating rating={rating} size="sm" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {_copy('Based on')}
          {_copy(count)}
          {_copy(' ')}
          {_copy(count === 1 ? 'published review' : 'published reviews')}
        </p>
      </div>
    </div>
  );
}
