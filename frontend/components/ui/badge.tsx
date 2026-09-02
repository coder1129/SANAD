import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export const badgeVariants = cva(
  'inline-flex w-fit items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold leading-5',
  {
    variants: {
      variant: {
        default: 'border-primary bg-primary text-primary-foreground',
        secondary: 'border-border bg-surface-muted text-primary',
        outline: 'border-border bg-transparent text-foreground',
        success: 'border-success/25 bg-success/10 text-success',
        warning: 'border-warning/35 bg-warning/10 text-foreground',
        error: 'border-error/25 bg-error/10 text-error',
        info: 'border-info/25 bg-info/10 text-info',
        neutral: 'border-border bg-surface-muted text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
