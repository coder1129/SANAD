'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
} from 'react';

import { cn } from '@/lib/utils/cn';

export function Pagination({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  const _copy = useCopy();

  return (
    <nav
      aria-label={_copy('Pagination')}
      className={cn('flex w-full justify-center', className)}
      {...props}
    />
  );
}

export function PaginationContent({
  className,
  ...props
}: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn(
        'flex flex-wrap items-center justify-center gap-1',
        className,
      )}
      {...props}
    />
  );
}

export function PaginationItem(props: HTMLAttributes<HTMLLIElement>) {
  return <li {...props} />;
}

export interface PaginationLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  disabled?: boolean;
  href: string;
  isCurrent?: boolean;
  size?: 'default' | 'icon';
}

export const PaginationLink = forwardRef<
  HTMLAnchorElement,
  PaginationLinkProps
>(
  (
    {
      className,
      disabled = false,
      href,
      isCurrent = false,
      onClick,
      size = 'icon',
      ...props
    },
    ref,
  ) => {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }

      onClick?.(event);
    };

    return (
      <a
        aria-current={isCurrent ? 'page' : undefined}
        aria-disabled={disabled || undefined}
        className={cn(
          'inline-flex min-h-10 items-center justify-center gap-1 rounded-md border text-sm font-semibold outline-none transition-colors duration-200',
          size === 'icon' ? 'min-w-10 px-2' : 'px-3',
          isCurrent
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-transparent text-primary hover:border-border hover:bg-surface-muted',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
        href={disabled ? undefined : href}
        onClick={handleClick}
        ref={ref}
        tabIndex={disabled ? -1 : undefined}
        {...props}
      />
    );
  },
);

PaginationLink.displayName = 'PaginationLink';

export function PaginationPrevious(props: PaginationLinkProps) {
  const _copy = useCopy();

  return (
    <PaginationLink
      aria-label={_copy('Go to previous page')}
      size="default"
      {...props}
    >
      <ChevronLeft aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">{_copy('Previous')}</span>
    </PaginationLink>
  );
}

export function PaginationNext(props: PaginationLinkProps) {
  const _copy = useCopy();

  return (
    <PaginationLink
      aria-label={_copy('Go to next page')}
      size="default"
      {...props}
    >
      <span className="hidden sm:inline">{_copy('Next')}</span>
      <ChevronRight aria-hidden="true" className="size-4" />
    </PaginationLink>
  );
}

export function PaginationEllipsis({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  const _copy = useCopy();

  return (
    <span
      className={cn('flex size-10 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal aria-hidden="true" className="size-4" />
      <span className="sr-only">{_copy('More pages')}</span>
    </span>
  );
}
