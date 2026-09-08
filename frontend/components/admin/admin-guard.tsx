'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { ShieldX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';

export function AdminGuard({ children }: { children: ReactNode }) {
  const _copy = useCopy();

  const router = useRouter();
  const { isAdmin, isAnonymous, isInitializing, logout } = useAuth();
  useEffect(() => {
    if (isAnonymous) router.replace('/admin/sign-in');
  }, [isAnonymous, router]);
  if (isInitializing || isAnonymous)
    return (
      <div className="p-8">
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  if (!isAdmin)
    return (
      <main className="grid min-h-svh place-items-center bg-surface-muted p-6">
        <div className="max-w-md border border-border bg-surface p-8 text-center">
          <ShieldX className="mx-auto size-9 text-error" aria-hidden="true" />
          <h1 className="type-h3 mt-5 text-primary">
            {_copy('Administrator access required')}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {_copy(
              'This signed-in account does not have permission to open SANAD administration.',
            )}
          </p>
          <Button
            className="mt-6"
            onClick={() =>
              void logout().then(() => router.replace('/admin/sign-in'))
            }
          >
            {_copy('Sign out')}
          </Button>
        </div>
      </main>
    );
  return <>{_copy(children)}</>;
}
