'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/utils/cn';

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full border border-border bg-surface-muted',
  {
    variants: {
      size: {
        sm: 'size-8 text-xs',
        md: 'size-10 text-sm',
        lg: 'size-12 text-base',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export interface AvatarProps
  extends
    ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  alt: string;
  fallback: string;
  src?: string;
}

export function Avatar({
  alt,
  className,
  fallback,
  size,
  src,
  ...props
}: AvatarProps) {
  const _copy = useCopy();

  return (
    <AvatarPrimitive.Root
      aria-hidden={alt ? undefined : true}
      aria-label={_copy(alt || undefined)}
      className={cn(avatarVariants({ size }), className)}
      role={alt ? 'img' : undefined}
      {...props}
    >
      {src ? (
        <AvatarPrimitive.Image
          alt={_copy('')}
          className="size-full object-cover"
          src={src}
        />
      ) : null}
      <AvatarPrimitive.Fallback
        aria-hidden="true"
        className="flex size-full items-center justify-center bg-surface-muted font-semibold uppercase text-primary"
        delayMs={src ? 250 : 0}
      >
        {_copy(fallback)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
