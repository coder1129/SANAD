'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';

export function PackageFeedbackUnavailable() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div
      role="status"
      className="mt-6 rounded-lg border border-border bg-surface-muted p-6"
    >
      <p className="text-sm text-muted-foreground">
        Reviews could not be loaded. You can still explore this service.
      </p>
      <Button
        className="mt-4"
        variant="outline"
        loading={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        Retry reviews
      </Button>
    </div>
  );
}
