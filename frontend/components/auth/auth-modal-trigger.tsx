'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';

import { type AuthModalMode, useAuthModal } from './auth-modal';

interface AuthModalTriggerProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'onClick'
> {
  children: ReactNode;
  nextTarget?: string;
  authMode?: AuthModalMode;
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
  authMode = 'sign-in',
  ...buttonProps
}: AuthModalTriggerProps) {
  const _copy = useCopy();

  const openAuthModal = useAuthModal();

  return (
    <Button
      {...buttonProps}
      onClick={() => openAuthModal(nextTarget, authMode)}
    >
      {_copy(children)}
    </Button>
  );
}
