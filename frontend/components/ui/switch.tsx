'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react';

import { cn } from '@/lib/utils/cn';

export const Switch = forwardRef<
  ComponentRef<typeof SwitchPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      'peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-[var(--control-border)] bg-surface-muted p-0.5 [direction:ltr] outline-none transition-colors duration-200 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none data-[state=checked]:border-primary data-[state=checked]:bg-primary',
      className,
    )}
    ref={ref}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none absolute top-0.5 left-0.5 block size-5 rounded-full bg-[var(--control-thumb)] shadow-sm transition-transform duration-200 data-[state=checked]:translate-x-[18px] motion-reduce:transition-none" />
  </SwitchPrimitive.Root>
));

Switch.displayName = SwitchPrimitive.Root.displayName;
