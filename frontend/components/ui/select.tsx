'use client';
import { useLocale } from 'next-intl';
import { useCopy } from '@/lib/i18n/use-copy';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react';

import { cn } from '@/lib/utils/cn';

export function Select(
  props: ComponentPropsWithoutRef<typeof SelectPrimitive.Root>,
) {
  const locale = useLocale();
  return (
    <SelectPrimitive.Root dir={locale === 'ar' ? 'rtl' : 'ltr'} {...props} />
  );
}
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export interface SelectTriggerProps extends ComponentPropsWithoutRef<
  typeof SelectPrimitive.Trigger
> {
  invalid?: boolean;
}

export const SelectTrigger = forwardRef<
  ComponentRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ children, className, invalid, ...props }, ref) => {
  const _copy = useCopy();
  return (
    <SelectPrimitive.Trigger
      aria-invalid={invalid || undefined}
      className={cn(
        'flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-md border border-[var(--control-border)] bg-surface px-3 py-2 text-start text-base text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-200 data-[placeholder]:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20 aria-invalid:focus-visible:ring-error sm:text-sm [&>span]:min-w-0 [&>span]:truncate',
        className,
      )}
      ref={ref}
      {...props}
    >
      {_copy(children)}
      <SelectPrimitive.Icon asChild>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 opacity-70"
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});

SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectScrollUpButton = forwardRef<
  ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    className={cn('flex h-8 items-center justify-center', className)}
    ref={ref}
    {...props}
  >
    <ChevronUp aria-hidden="true" className="size-4" />
  </SelectPrimitive.ScrollUpButton>
));

SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

export const SelectScrollDownButton = forwardRef<
  ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    className={cn('flex h-8 items-center justify-center', className)}
    ref={ref}
    {...props}
  >
    <ChevronDown aria-hidden="true" className="size-4" />
  </SelectPrimitive.ScrollDownButton>
));

SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

export const SelectContent = forwardRef<
  ComponentRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ children, className, position = 'popper', ...props }, ref) => {
  const _copy = useCopy();
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'relative z-50 max-h-80 min-w-32 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-border bg-surface text-foreground shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:transition-none',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        ref={ref}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'min-w-[var(--radix-select-trigger-width)]',
          )}
        >
          {_copy(children)}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});

SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectLabel = forwardRef<
  ComponentRef<typeof SelectPrimitive.Label>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    className={cn(
      'px-2 py-1.5 text-xs font-semibold text-muted-foreground',
      className,
    )}
    ref={ref}
    {...props}
  />
));

SelectLabel.displayName = SelectPrimitive.Label.displayName;

export const SelectItem = forwardRef<
  ComponentRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ children, className, ...props }, ref) => {
  const _copy = useCopy();
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex min-h-10 w-full cursor-default select-none items-center rounded-sm py-2 pe-8 ps-2 text-sm outline-none focus:bg-surface-muted focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    >
      <SelectPrimitive.ItemText>{_copy(children)}</SelectPrimitive.ItemText>
      <span className="absolute end-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check aria-hidden="true" className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
});

SelectItem.displayName = SelectPrimitive.Item.displayName;

export const SelectSeparator = forwardRef<
  ComponentRef<typeof SelectPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    ref={ref}
    {...props}
  />
));

SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
