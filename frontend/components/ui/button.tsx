import { useCopy } from '@/lib/i18n/use-copy';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

import { Spinner } from './spinner';

export const buttonVariants = cva(
  'inline-flex max-w-full items-center justify-center gap-2 break-words rounded-md border text-center text-sm font-semibold leading-5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'border-primary bg-primary text-primary-foreground shadow-xs hover:border-secondary hover:bg-secondary',
        secondary:
          'border-secondary bg-secondary text-secondary-foreground shadow-xs hover:border-primary hover:bg-primary',
        outline:
          'border-border bg-surface text-primary hover:border-accent hover:bg-surface-muted',
        ghost:
          'border-transparent bg-transparent text-primary hover:bg-surface-muted',
        destructive:
          'border-destructive bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
      },
      size: {
        sm: 'min-h-9 px-3',
        md: 'min-h-11 px-4',
        lg: 'min-h-12 px-5 text-base',
        icon: 'size-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'disabled'
>;

type SharedButtonProps = NativeButtonProps &
  Omit<ButtonVariantProps, 'size'> & {
    asChild?: boolean;
    disabled?: boolean;
    leftIcon?: ReactNode;
    loading?: boolean;
    loadingLabel?: string;
    rightIcon?: ReactNode;
  };

export type ButtonProps = SharedButtonProps &
  (
    | {
        size: 'icon';
        'aria-label': string;
      }
    | {
        size?: 'sm' | 'md' | 'lg' | null;
      }
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild = false,
      children,
      className,
      disabled,
      leftIcon,
      loading = false,
      loadingLabel = 'Loading',
      rightIcon,
      size = 'md',
      type = 'button',
      variant,
      ...props
    },
    ref,
  ) => {
    const _copy = useCopy();

    const Component = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    return (
      <Component
        aria-busy={loading || undefined}
        aria-disabled={asChild && isDisabled ? true : undefined}
        className={cn(buttonVariants({ size, variant }), className)}
        ref={ref}
        {...(!asChild ? { disabled: isDisabled, type } : {})}
        {...props}
      >
        {loading ? (
          <Spinner label={_copy(null)} size="sm" />
        ) : leftIcon ? (
          <span aria-hidden="true">{_copy(leftIcon)}</span>
        ) : null}
        {loading && size === 'icon' ? null : (
          <Slottable>{_copy(children)}</Slottable>
        )}
        {loading ? (
          <span className="sr-only">{_copy(loadingLabel)}</span>
        ) : null}
        {!loading && rightIcon ? (
          <span aria-hidden="true">{_copy(rightIcon)}</span>
        ) : null}
      </Component>
    );
  },
);

Button.displayName = 'Button';
