'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import Link from 'next/link';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api';

import { AuthModalTrigger } from './auth-modal-trigger';

type VerificationState = 'error' | 'loading' | 'success';

export function VerifyEmailStatus({ token }: { token?: string }) {
  const _copy = useCopy();

  const startedRef = useRef(false);
  const [state, setState] = useState<VerificationState>(
    token ? 'loading' : 'error',
  );
  const [message, setMessage] = useState(
    token
      ? 'Confirming your email address…'
      : 'The verification link is incomplete.',
  );

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;

    void authApi
      .verifyEmail(token)
      .then((result) => {
        setState('success');
        setMessage(result.message ?? 'Your email address has been verified.');
      })
      .catch(() => {
        setState('error');
        setMessage(
          'This verification link is invalid or has expired. Request a new link from the sign-in screen.',
        );
      });
  }, [token]);

  return (
    <section
      aria-live="polite"
      className="mx-auto w-full max-w-xl border border-border bg-surface p-8 text-center shadow-sm"
    >
      {state === 'loading' ? (
        <LoaderCircle
          aria-hidden="true"
          className="mx-auto size-10 animate-spin text-secondary motion-reduce:animate-none"
        />
      ) : state === 'success' ? (
        <CheckCircle2
          aria-hidden="true"
          className="mx-auto size-10 text-success"
        />
      ) : (
        <XCircle
          aria-hidden="true"
          className="mx-auto size-10 text-destructive"
        />
      )}
      <h1 className="type-h2 mt-5 text-primary">
        {_copy('Email verification')}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {_copy(message)}
      </p>
      {state !== 'loading' ? (
        state === 'success' ? (
          <AuthModalTrigger className="mt-7">
            {_copy('Continue to sign in')}
          </AuthModalTrigger>
        ) : (
          <Button asChild className="mt-7">
            <Link href="/">{_copy('Back to home')}</Link>
          </Button>
        )
      ) : null}
    </section>
  );
}
