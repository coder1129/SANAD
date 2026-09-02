import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

const spinnerVariants = cva(
  'inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none',
  {
    variants: {
      size: {
        sm: 'size-4',
        md: 'size-5',
        lg: 'size-7',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export interface SpinnerProps
  extends
    HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string | null;
}

export function Spinner({
  className,
  label = 'Loading',
  size,
  ...props
}: SpinnerProps) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      className={cn(spinnerVariants({ size }), className)}
      role={label ? 'status' : undefined}
      {...props}
    >
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
