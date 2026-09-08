'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';

export function PackageFeedbackUnavailable() {
  const _copy = useCopy();

  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div
      role="status"
      className="mt-6 rounded-lg border border-border bg-surface-muted p-6"
    >
      <p className="text-sm text-muted-foreground">
        {_copy(
          'Reviews could not be loaded. You can still explore this service.',
        )}
      </p>
      <Button
        className="mt-4"
        variant="outline"
        loading={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {_copy('Retry reviews')}
      </Button>
    </div>
  );
}
