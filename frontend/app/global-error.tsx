'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center bg-white p-6 text-slate-900">
          <section className="w-full max-w-xl border border-slate-200 p-8 text-center shadow-sm">
            <h1 className="text-3xl font-semibold">Something went wrong.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The error has been recorded. You can safely try loading the page
              again.
            </p>
            <button
              className="mt-7 rounded-md bg-slate-900 px-5 py-3 font-semibold text-white"
              onClick={reset}
              type="button"
            >
              Try Again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
