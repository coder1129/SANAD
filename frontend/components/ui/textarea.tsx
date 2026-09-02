import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        'flex min-h-28 w-full resize-y rounded-md border border-[var(--control-border)] bg-surface px-3 py-2.5 text-base text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:resize-none disabled:bg-surface-muted aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20 aria-invalid:focus-visible:ring-error sm:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
