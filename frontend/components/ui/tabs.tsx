'use client';
import { useLocale } from 'next-intl';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react';

import { cn } from '@/lib/utils/cn';

export function Tabs(
  props: ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
) {
  const locale = useLocale();
  return (
    <TabsPrimitive.Root dir={locale === 'ar' ? 'rtl' : 'ltr'} {...props} />
  );
}

export const TabsList = forwardRef<
  ComponentRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    className={cn(
      'flex min-h-11 w-full items-end gap-1 overflow-x-auto border-b border-border',
      className,
    )}
    ref={ref}
    {...props}
  />
));

TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = forwardRef<
  ComponentRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    className={cn(
      'min-h-10 shrink-0 border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-muted-foreground outline-none transition-colors duration-200 hover:text-primary focus-visible:text-primary disabled:pointer-events-none data-[state=active]:border-primary data-[state=active]:text-primary',
      className,
    )}
    ref={ref}
    {...props}
  />
));

TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = forwardRef<
  ComponentRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    className={cn('mt-5 outline-none', className)}
    ref={ref}
    {...props}
  />
));

TabsContent.displayName = TabsPrimitive.Content.displayName;
