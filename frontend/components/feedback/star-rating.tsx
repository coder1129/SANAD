import { useCopy } from '@/lib/i18n/use-copy';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({ rating, size = 'md' }: StarRatingProps) {
  const _copy = useCopy();

  const safeRating = Math.min(5, Math.max(0, Math.round(rating)));
  const sizeClass = {
    sm: 'size-3.5',
    md: 'size-4',
    lg: 'size-5',
  }[size];

  return (
    <span
      aria-label={_copy(
        `${safeRating} out of 5 stars`,
        `${safeRating} من 5 نجوم`,
      )}
      className="inline-flex items-center gap-0.5 text-accent"
      role="img"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          aria-hidden="true"
          className={sizeClass}
          fill={index < safeRating ? 'currentColor' : 'none'}
          key={index}
          strokeWidth={1.8}
        />
      ))}
    </span>
  );
}
