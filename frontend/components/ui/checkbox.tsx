'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react';

import { cn } from '@/lib/utils/cn';

export interface CheckboxProps extends ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
> {
  invalid?: boolean;
}

export const Checkbox = forwardRef<
  ComponentRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, invalid, ...props }, ref) => (
  <CheckboxPrimitive.Root
    aria-invalid={invalid || undefined}
    className={cn(
      'peer flex size-6 shrink-0 items-center justify-center rounded-sm border border-[var(--control-border)] bg-surface text-primary-foreground shadow-xs outline-none transition-colors duration-200 hover:border-primary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none data-[state=checked]:border-primary data-[state=checked]:bg-primary aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20 aria-invalid:focus-visible:ring-error',
      className,
    )}
    ref={ref}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;
