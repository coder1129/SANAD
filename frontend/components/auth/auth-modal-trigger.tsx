'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';

import { useAuthModal } from './auth-modal';

interface AuthModalTriggerProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'onClick'
> {
  children: ReactNode;
  nextTarget?: string;
  variant?: ButtonProps['variant'];
  size?: 'sm' | 'md' | 'lg' | null;
  loading?: boolean;
  loadingLabel?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function AuthModalTrigger({
  children,
  nextTarget,
  ...buttonProps
}: AuthModalTriggerProps) {
  const openAuthModal = useAuthModal();

  return (
    <Button {...buttonProps} onClick={() => openAuthModal(nextTarget)}>
      {children}
    </Button>
  );
}
