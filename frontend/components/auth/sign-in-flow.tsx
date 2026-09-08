'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Mail, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { AuthTokens, User } from '@/types/domain';
import { authApi } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { establishAuthenticatedSession } from '@/lib/auth/auth-session';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import { useCopy } from '@/lib/i18n/use-copy';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { GoogleAuthButton } from './google-auth-button';
import { OtpInput } from './otp-input';

const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address')
    .max(255),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type SignInStep = 'email' | 'otp';

export interface SignInFlowProps {
  nextTarget?: string;
  onComplete?: () => void;
  onSwitchToSignUp?: () => void;
}

export function SignInFlow({
  nextTarget: modalTarget,
  onComplete,
  onSwitchToSignUp,
}: SignInFlowProps = {}) {
  const _copy = useCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = modalTarget ?? searchParams.get('next');
  const [step, setStep] = React.useState<SignInStep>('email');
  const [email, setEmail] = React.useState('');
  const [maskedEmail, setMaskedEmail] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [cooldownRemaining, setCooldownRemaining] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<string>();
  const [info, setInfo] = React.useState<string | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  React.useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = window.setInterval(
      () => setCooldownRemaining((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  const completeAuthentication = React.useCallback(
    (user: User, tokens: AuthTokens) => {
      establishAuthenticatedSession({ user, tokens });
      onComplete?.();
      router.replace(sanitizeRedirectPath(nextTarget, '/'));
    },
    [nextTarget, onComplete, router],
  );

  const showError = React.useCallback((requestError: unknown) => {
    if (requestError instanceof ApiError) {
      setErrorCode(requestError.code);
      setError(requestError.message || 'Sign in failed. Please try again.');
      return;
    }
    setErrorCode(undefined);
    setError('Sign in failed. Please try again.');
  }, []);

  const requestCode = async (address: string) => {
    setError(null);
    setErrorCode(undefined);
    setInfo(null);
    const result = await authApi.requestPasswordlessOtp(address, 'sign_in');
    setEmail(address.toLowerCase().trim());
    setMaskedEmail(result.email);
    setOtp('');
    setStep('otp');
    setCooldownRemaining(60);
    setInfo('A 6-digit verification code has been sent to your email.');
  };

  const onEmailSubmit = async (values: EmailFormValues) => {
    try {
      await requestCode(values.email);
    } catch (requestError) {
      showError(requestError);
    }
  };

  const verifyCode = async (value?: string) => {
    const code = (value ?? otp).trim();
    if (code.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setError(null);
    setInfo(null);
    setIsVerifying(true);
    try {
      const result = await authApi.verifyPasswordlessOtp(
        email,
        code,
        'sign_in',
      );
      if (result.status === 'authenticated') {
        completeAuthentication(result.user, result.tokens);
      }
    } catch (requestError) {
      showError(requestError);
    } finally {
      setIsVerifying(false);
    }
  };

  const resendCode = async () => {
    if (cooldownRemaining > 0) return;
    try {
      await requestCode(email);
      setInfo('A new verification code has been sent.');
    } catch (requestError) {
      showError(requestError);
    }
  };

  const authenticateWithGoogle = async (credential: string) => {
    setError(null);
    setErrorCode(undefined);
    setIsGoogleLoading(true);
    try {
      const result = await authApi.authenticateWithGoogle(
        credential,
        'sign_in',
      );
      if (result.status === 'authenticated') {
        completeAuthentication(result.user, result.tokens);
      }
    } catch (requestError) {
      showError(requestError);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const switchToSignUp = () => {
    if (onSwitchToSignUp) onSwitchToSignUp();
    else router.push('/sign-up');
  };

  return (
    <div className="mx-auto w-full max-w-md pt-2">
      <div className="mb-7 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {_copy('Customer Sign In')}
        </p>
        <h1 className="font-display text-2xl font-normal tracking-tight text-primary">
          {_copy(step === 'email' ? 'Welcome back' : 'Check your email')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {_copy(
            step === 'email'
              ? 'Sign in to your existing account with Google or a verification code.'
              : 'Enter the 6-digit verification code sent to your email.',
          )}
        </p>
        {step === 'otp' ? (
          <p className="mt-2 font-semibold text-primary" dir="ltr">
            {_copy(maskedEmail || email)}
          </p>
        ) : null}
      </div>

      {error ? (
        <Alert
          className="mb-5"
          description={
            <div className="space-y-3">
              <p>{_copy(error)}</p>
              {errorCode === 'ACCOUNT_NOT_FOUND' ? (
                <Button onClick={switchToSignUp} size="sm" variant="outline">
                  {_copy('Create a new account')}
                </Button>
              ) : null}
              {errorCode === 'ADMIN_SIGN_IN_REQUIRED' ? (
                <Link
                  className="inline-block text-xs font-semibold underline"
                  href="/admin/sign-in"
                >
                  {_copy('Go to Staff & Administrator Portal')}
                </Link>
              ) : null}
            </div>
          }
          title={_copy('Sign in failed')}
          variant="error"
        />
      ) : null}

      {info ? (
        <Alert className="mb-5" description={_copy(info)} variant="success" />
      ) : null}

      {step === 'email' ? (
        <div className="space-y-5">
          <GoogleAuthButton
            flow="sign_in"
            loading={isGoogleLoading}
            onCredential={authenticateWithGoogle}
            onError={(message) => setError(message)}
          />

          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>{_copy('or continue with email')}</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form
            className="space-y-5"
            noValidate
            onSubmit={handleSubmit(onEmailSubmit)}
          >
            <FormField
              error={_copy(errors.email?.message)}
              label={_copy('Email address')}
              required
            >
              <div className="relative">
                <Input
                  {...register('email')}
                  autoComplete="email"
                  className="dir-ltr ps-10 text-start"
                  disabled={isSubmitting}
                  placeholder={_copy('name@example.com')}
                  type="email"
                />
                <Mail className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
              </div>
            </FormField>
            <Button
              className="h-12 w-full"
              loading={isSubmitting}
              loadingLabel={_copy('Sending code...')}
              size="lg"
              type="submit"
            >
              {_copy('Continue with Email')}
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg border border-border/70 bg-surface-muted/35 px-3 py-5 sm:px-5">
            <OtpInput
              disabled={isVerifying}
              hasError={Boolean(error)}
              onChange={(value) => {
                setOtp(value);
                setError(null);
              }}
              onComplete={verifyCode}
              value={otp}
            />
          </div>
          <Button
            className="h-12 w-full"
            disabled={otp.length !== 6 || isVerifying}
            loading={isVerifying}
            loadingLabel={_copy('Verifying code...')}
            onClick={() => verifyCode()}
            size="lg"
            type="button"
          >
            {_copy('Sign In')}
            <CheckCircle2 className="size-4" />
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs">
            <button
              className="font-semibold text-secondary disabled:text-muted-foreground"
              disabled={cooldownRemaining > 0}
              onClick={resendCode}
              type="button"
            >
              <RefreshCw className="me-1 inline size-3.5" />
              {_copy(
                cooldownRemaining > 0
                  ? `Resend code in ${cooldownRemaining}s`
                  : 'Resend code',
              )}
            </button>
            <button
              className="text-muted-foreground underline hover:text-primary"
              onClick={() => {
                setStep('email');
                setOtp('');
                setError(null);
                setInfo(null);
              }}
              type="button"
            >
              {_copy('Use a different email')}
            </button>
          </div>
        </div>
      )}

      <p className="mt-7 border-t border-border pt-5 text-center text-sm text-muted-foreground">
        {_copy("Don't have an account?")}{' '}
        <button
          className="font-semibold text-secondary underline underline-offset-4"
          onClick={switchToSignUp}
          type="button"
        >
          {_copy('Sign Up')}
        </button>
      </p>
    </div>
  );
}
