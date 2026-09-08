'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { ServerCrash } from 'lucide-react';

import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';

export default function PackagesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const _copy = useCopy();

  return (
    <div className="layout-container layout-section">
      <ErrorState
        action={<Button onClick={reset}>{_copy('Try Again')}</Button>}
        description={_copy(
          'We could not load the current service information. Please try again in a moment.',
        )}
        icon={<ServerCrash />}
        title={_copy('Services are temporarily unavailable')}
      />
    </div>
  );
}
