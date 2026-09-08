'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type HTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = forwardRef<
  ComponentRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    data-slot="dialog-overlay"
    className={cn(
      'fixed inset-0 z-50 bg-primary/45 backdrop-blur-[1px]',
      'transition-opacity data-[state=open]:duration-450 data-[state=closed]:duration-200 ease-[var(--ease-standard)] motion-reduce:transition-none',
      'data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
      className,
    )}
    ref={ref}
    {...props}
  />
));

DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = forwardRef<
  ComponentRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ children, className, ...props }, ref) => {
  const _copy = useCopy();
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 gap-5 overflow-y-auto rounded-lg border border-border bg-surface p-5 text-foreground shadow-lg outline-none sm:p-6',
          'transition-[opacity,transform] data-[state=open]:duration-[450ms] data-[state=closed]:duration-200 ease-[var(--ease-standard)] motion-reduce:transition-none',
          'data-[state=open]:opacity-100 data-[state=open]:-translate-y-1/2',
          'data-[state=closed]:opacity-0 data-[state=closed]:translate-y-[-40%]',
          className,
        )}
        ref={ref}
        {...props}
      >
        {_copy(children)}
        <DialogPrimitive.Close
          aria-label={_copy('Close dialog')}
          className="absolute top-3 end-3 flex size-10 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-200 hover:bg-surface-muted hover:text-primary"
        >
          <X aria-hidden="true" className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

DialogContent.displayName = DialogPrimitive.Content.displayName;

export function DialogHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-2 pe-9', className)} {...props} />;
}

export function DialogFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-3 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

export const DialogTitle = forwardRef<
  ComponentRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    className={cn('type-h4', className)}
    ref={ref}
    {...props}
  />
));

DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = forwardRef<
  ComponentRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    className={cn('text-sm leading-6 text-muted-foreground', className)}
    ref={ref}
    {...props}
  />
));

DialogDescription.displayName = DialogPrimitive.Description.displayName;
