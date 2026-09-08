'use client';
import { useLocale } from 'next-intl';
import { useCopy } from '@/lib/i18n/use-copy';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type HTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils/cn';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export const SheetOverlay = forwardRef<
  ComponentRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      'sanad-sheet-overlay fixed inset-0 z-50 bg-primary/45 backdrop-blur-[1px] motion-reduce:animate-none',
      className,
    )}
    ref={ref}
    {...props}
  />
));

SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetVariants = cva(
  'fixed z-50 overflow-y-auto border-border bg-surface p-5 text-foreground shadow-lg outline-none sm:p-6',
  {
    variants: {
      side: {
        right:
          'inset-y-0 right-0 h-full w-[min(24rem,calc(100vw-1rem))] border-s',
        left: 'inset-y-0 left-0 h-full w-[min(24rem,calc(100vw-1rem))] border-e',
        top: 'inset-x-0 top-0 max-h-[calc(100svh-1rem)] w-full border-b',
        bottom: 'inset-x-0 bottom-0 max-h-[calc(100svh-1rem)] w-full border-t',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
);

export interface SheetContentProps
  extends
    ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

export const SheetContent = forwardRef<
  ComponentRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ children, className, side = 'right', ...props }, ref) => {
  const _copy = useCopy();
  const locale = useLocale();
  const physicalSide =
    locale === 'ar'
      ? side === 'right'
        ? 'left'
        : side === 'left'
          ? 'right'
          : side
      : side;
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(
          'sanad-sheet-panel motion-reduce:animate-none',
          sheetVariants({ side: physicalSide }),
          className,
        )}
        data-side={physicalSide}
        ref={ref}
        {...props}
      >
        {_copy(children)}
        <DialogPrimitive.Close
          aria-label={_copy('Close panel')}
          className="absolute top-3 end-3 flex size-10 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-200 hover:bg-surface-muted hover:text-primary"
        >
          <X aria-hidden="true" className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});

SheetContent.displayName = DialogPrimitive.Content.displayName;

export function SheetHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-2 pe-9', className)} {...props} />;
}

export function SheetFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-6 flex flex-col-reverse gap-3 sm:flex-row', className)}
      {...props}
    />
  );
}

export const SheetTitle = forwardRef<
  ComponentRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    className={cn('type-h4', className)}
    ref={ref}
    {...props}
  />
));

SheetTitle.displayName = DialogPrimitive.Title.displayName;

export const SheetDescription = forwardRef<
  ComponentRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    className={cn('text-sm leading-6 text-muted-foreground', className)}
    ref={ref}
    {...props}
  />
));

SheetDescription.displayName = DialogPrimitive.Description.displayName;
