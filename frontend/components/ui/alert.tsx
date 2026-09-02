import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

const alertVariants = cva(
  'grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md border p-4',
  {
    variants: {
      variant: {
        info: 'border-info/25 bg-info/10 text-info',
        success: 'border-success/25 bg-success/10 text-success',
        warning: 'border-warning/25 bg-warning/10 text-warning',
        error: 'border-error/25 bg-error/10 text-error',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

export interface AlertProps
  extends
    Omit<HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof alertVariants> {
  description: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
}

export function Alert({
  className,
  description,
  icon,
  title,
  variant = 'info',
  ...props
}: AlertProps) {
  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      role={variant === 'error' ? 'alert' : 'status'}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className="mt-0.5 [&_svg]:size-5">
          {icon}
        </span>
      ) : (
        <span aria-hidden="true" />
      )}
      <div className="min-w-0">
        {title ? (
          <p className="font-semibold text-foreground">{title}</p>
        ) : null}
        <div className="text-sm leading-6 text-foreground/80">
          {description}
        </div>
      </div>
    </div>
  );
}
