'use client';
import { useLocale } from 'next-intl';
import { useCopy } from '@/lib/i18n/use-copy';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type HTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils/cn';

export function DropdownMenu(
  props: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>,
) {
  const locale = useLocale();
  return (
    <DropdownMenuPrimitive.Root
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      {...props}
    />
  );
}
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export interface DropdownMenuSubTriggerProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubTrigger
> {
  inset?: boolean;
}

export const DropdownMenuSubTrigger = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.SubTrigger>,
  DropdownMenuSubTriggerProps
>(({ children, className, inset, ...props }, ref) => {
  const _copy = useCopy();
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(
        'flex min-h-10 cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none focus:bg-surface-muted data-[state=open]:bg-surface-muted',
        inset && 'ps-8',
        className,
      )}
      ref={ref}
      {...props}
    >
      {_copy(children)}
      <ChevronRight aria-hidden="true" className="ms-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
});

DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName;

export const DropdownMenuSubContent = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.SubContent>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    className={cn(
      'z-50 max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height))] min-w-40 max-w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border border-border bg-surface p-1 text-foreground shadow-md',
      className,
    )}
    ref={ref}
    {...props}
  />
));

DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName;

export const DropdownMenuContent = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      className={cn(
        'z-50 max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height))] min-w-44 max-w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border border-border bg-surface p-1 text-foreground shadow-md',
        className,
      )}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));

DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

export interface DropdownMenuItemProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Item
> {
  destructive?: boolean;
  inset?: boolean;
}

export const DropdownMenuItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(({ className, destructive, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    className={cn(
      'relative flex min-h-10 cursor-default select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none transition-colors focus:bg-surface-muted focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
      inset && 'ps-8',
      destructive && 'text-error focus:bg-error/10 focus:text-error',
      className,
    )}
    ref={ref}
    {...props}
  />
));

DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

export const DropdownMenuCheckboxItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ children, className, ...props }, ref) => {
  const _copy = useCopy();
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(
        'relative flex min-h-10 cursor-default select-none items-center rounded-sm py-2 pe-2 ps-8 text-sm outline-none focus:bg-surface-muted focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    >
      <span className="absolute start-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check aria-hidden="true" className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {_copy(children)}
    </DropdownMenuPrimitive.CheckboxItem>
  );
});

DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName;

export const DropdownMenuRadioItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.RadioItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ children, className, ...props }, ref) => {
  const _copy = useCopy();
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(
        'relative flex min-h-10 cursor-default select-none items-center rounded-sm py-2 pe-2 ps-8 text-sm outline-none focus:bg-surface-muted focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    >
      <span className="absolute start-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle aria-hidden="true" className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {_copy(children)}
    </DropdownMenuPrimitive.RadioItem>
  );
});

DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

export interface DropdownMenuLabelProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Label
> {
  inset?: boolean;
}

export const DropdownMenuLabel = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Label>,
  DropdownMenuLabelProps
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    className={cn(
      'px-2 py-1.5 text-xs font-semibold text-muted-foreground',
      inset && 'ps-8',
      className,
    )}
    ref={ref}
    {...props}
  />
));

DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

export const DropdownMenuSeparator = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    ref={ref}
    {...props}
  />
));

DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export function DropdownMenuShortcut({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'ms-auto ps-4 text-xs tracking-wider opacity-60',
        className,
      )}
      {...props}
    />
  );
}
