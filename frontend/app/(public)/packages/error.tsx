'use client';

import { ServerCrash } from 'lucide-react';

import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';

export default function PackagesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="layout-container layout-section">
      <ErrorState
        action={<Button onClick={reset}>Try Again</Button>}
        description="We could not load the current service information. Please try again in a moment."
        icon={<ServerCrash />}
        title="Services are temporarily unavailable"
      />
    </div>
  );
}
