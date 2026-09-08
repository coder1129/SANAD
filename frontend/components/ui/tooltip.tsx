'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react';

import { cn } from '@/lib/utils/cn';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  ComponentRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => {
  const _copy = useCopy();
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={cn(
          'z-50 max-w-72 rounded-sm bg-primary px-3 py-2 text-xs leading-5 text-primary-foreground shadow-md',
          className,
        )}
        ref={ref}
        sideOffset={sideOffset}
        {...props}
      >
        {_copy(props.children)}
        <TooltipPrimitive.Arrow className="fill-primary" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
});

TooltipContent.displayName = TooltipPrimitive.Content.displayName;
