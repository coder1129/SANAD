'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { LockKeyhole } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AuthModalTrigger, RequireAuth } from '@/components/auth';
import { Skeleton } from '@/components/ui/skeleton';

export function AccountGuard({ children }: { children: ReactNode }) {
  const _copy = useCopy();

  const pathname = usePathname();
  return (
    <RequireAuth
      fallback={
        <div className="layout-container py-16">
          <Skeleton className="h-64 w-full" />
        </div>
      }
      denied={
        <section className="layout-container py-16 sm:py-24">
          <div className="mx-auto max-w-lg border border-border bg-surface p-8 text-center shadow-sm">
            <LockKeyhole
              aria-hidden="true"
              className="mx-auto size-8 text-accent"
            />
            <h1 className="type-h3 mt-5 text-primary">
              {_copy('Sign in to your account')}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {_copy(
                'Use your email verification code to view your profile and orders securely.',
              )}
            </p>
            <AuthModalTrigger className="mt-7" nextTarget={pathname} size="lg">
              {_copy('Continue with email')}
            </AuthModalTrigger>
          </div>
        </section>
      }
    >
      {_copy(children)}
    </RequireAuth>
  );
}
