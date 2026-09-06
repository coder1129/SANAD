'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';

export default function ApplicationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <main className="grid min-h-[70svh] place-items-center bg-surface-muted p-6">
      <section className="w-full max-w-xl border border-border bg-surface p-8 text-center shadow-sm">
        <AlertTriangle
          aria-hidden="true"
          className="mx-auto size-10 text-warning"
        />
        <h1 className="type-h2 mt-5 text-primary">Something went wrong.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We couldn&apos;t load this page. Try again, or return to the SANAD
          homepage.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => reset()}>Try Again</Button>
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
