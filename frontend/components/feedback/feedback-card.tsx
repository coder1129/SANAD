import { Quote } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getPackageShortTitle } from '@/lib/packages/presentation';
import type { CareerPackage, Testimonial } from '@/types/domain';

import { StarRating } from './star-rating';

interface FeedbackCardProps {
  packageItem?: CareerPackage;
  testimonial: Testimonial;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

export function FeedbackCard({ packageItem, testimonial }: FeedbackCardProps) {
  return (
    <Card className="flex h-full flex-col border-border/90 shadow-xs">
      <CardHeader className="gap-4 border-b border-border/70">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {getInitials(testimonial.customerName)}
          </span>
          <Quote aria-hidden="true" className="size-6 text-accent/70" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StarRating rating={testimonial.rating} />
          {packageItem ? (
            <span className="text-xs font-semibold text-secondary">
              {getPackageShortTitle(packageItem)}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-5">
        <p className="text-base leading-7 text-foreground">
          {testimonial.textEn}
        </p>
        <div className="mt-auto pt-7">
          <p className="font-semibold text-primary">
            {testimonial.customerName}
          </p>
          {testimonial.customerTitle ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {testimonial.customerTitle}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
