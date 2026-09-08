'use client';
import { useLocale } from 'next-intl';
import { useCopy } from '@/lib/i18n/use-copy';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react';

import { cn } from '@/lib/utils/cn';

export function Accordion(
  props: ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>,
) {
  const locale = useLocale();
  return (
    <AccordionPrimitive.Root dir={locale === 'ar' ? 'rtl' : 'ltr'} {...props} />
  );
}

export const AccordionItem = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Item>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    className={cn('border-b border-border', className)}
    ref={ref}
    {...props}
  />
));

AccordionItem.displayName = AccordionPrimitive.Item.displayName;

export const AccordionTrigger = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ children, className, ...props }, ref) => {
  const _copy = useCopy();
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'group flex min-h-12 flex-1 items-center justify-between gap-4 py-3 text-start text-sm font-semibold text-foreground outline-none transition-colors duration-200 hover:text-primary disabled:pointer-events-none',
          className,
        )}
        ref={ref}
        {...props}
      >
        <span className="min-w-0">{_copy(children)}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});

AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

export const AccordionContent = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ children, className, ...props }, ref) => {
  const _copy = useCopy();
  return (
    <AccordionPrimitive.Content
      className="sanad-accordion-content overflow-hidden text-sm text-muted-foreground motion-reduce:animate-none"
      ref={ref}
      {...props}
    >
      <div className={cn('pb-4 leading-6', className)}>{_copy(children)}</div>
    </AccordionPrimitive.Content>
  );
});

AccordionContent.displayName = AccordionPrimitive.Content.displayName;
