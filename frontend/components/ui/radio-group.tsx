'use client';

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import {
  createContext,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  useContext,
} from 'react';

import { cn } from '@/lib/utils/cn';

export interface RadioGroupProps extends ComponentPropsWithoutRef<
  typeof RadioGroupPrimitive.Root
> {
  invalid?: boolean;
}

const RadioGroupInvalidContext = createContext(false);

export const RadioGroup = forwardRef<
  ComponentRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ 'aria-invalid': ariaInvalid, className, invalid, ...props }, ref) => {
  const isInvalid = invalid || ariaInvalid === true || ariaInvalid === 'true';

  return (
    <RadioGroupInvalidContext.Provider value={isInvalid}>
      <RadioGroupPrimitive.Root
        aria-invalid={isInvalid || undefined}
        className={cn('grid gap-3', className)}
        data-invalid={isInvalid || undefined}
        ref={ref}
        {...props}
      />
    </RadioGroupInvalidContext.Provider>
  );
});

RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

export const RadioGroupItem = forwardRef<
  ComponentRef<typeof RadioGroupPrimitive.Item>,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ 'aria-invalid': ariaInvalid, className, ...props }, ref) => {
  const groupInvalid = useContext(RadioGroupInvalidContext);
  const isInvalid =
    groupInvalid || ariaInvalid === true || ariaInvalid === 'true';

  return (
    <RadioGroupPrimitive.Item
      aria-invalid={isInvalid || undefined}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--control-border)] bg-surface text-primary shadow-xs outline-none transition-colors duration-200 hover:border-primary focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none aria-invalid:border-error aria-invalid:focus-visible:ring-error',
        !isInvalid && 'data-[state=checked]:border-primary',
        className,
      )}
      ref={ref}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle aria-hidden="true" className="size-2.5 fill-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});

RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;
