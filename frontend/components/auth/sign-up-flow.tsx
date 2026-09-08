'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Mail, Phone, RefreshCw } from 'lucide-react';
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

const signUpSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address')
    .max(255),
  phone: z
    .string()
    .trim()
    .min(5, 'Please enter a valid phone number')
    .max(20, 'Phone number is too long')
    .regex(/^[\d\s+\-()]+$/, 'Invalid phone number format'),
  gender: z.enum(['male', 'female'], {
    message: 'Please select your gender',
  }),
});

type SignUpValues = z.infer<typeof signUpSchema>;
type SignUpStep = 'details' | 'otp' | 'google-details';

export interface SignUpFlowProps {
  nextTarget?: string;
  onComplete?: () => void;
  onSwitchToSignIn?: () => void;
}

export function SignUpFlow({
  nextTarget: modalTarget,
  onComplete,
  onSwitchToSignIn,
}: SignUpFlowProps = {}) {
  const _copy = useCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = modalTarget ?? searchParams.get('next');
  const [step, setStep] = React.useState<SignUpStep>('details');
  const [maskedEmail, setMaskedEmail] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [registrationToken, setRegistrationToken] = React.useState('');
  const [pendingValues, setPendingValues] = React.useState<SignUpValues>();
  const [cooldownRemaining, setCooldownRemaining] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<string>();
  const [info, setInfo] = React.useState<string | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: 'male',
    },
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
      setError(
        requestError.message || 'Account creation failed. Please try again.',
      );
      return;
    }
    setErrorCode(undefined);
    setError('Account creation failed. Please try again.');
  }, []);

  const requestCode = async (values: SignUpValues) => {
    setError(null);
    setErrorCode(undefined);
    setInfo(null);
    const result = await authApi.requestPasswordlessOtp(
      values.email,
      'sign_up',
    );
    setPendingValues(values);
    setMaskedEmail(result.email);
    setOtp('');
    setStep('otp');
    setCooldownRemaining(60);
    setInfo('A 6-digit verification code has been sent to your email.');
  };

  const submitDetails = async (values: SignUpValues) => {
    if (step === 'google-details') {
      setError(null);
      try {
        const result = await authApi.completePasswordlessProfile({
          registrationToken,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          gender: values.gender,
        });
        completeAuthentication(result.user, result.tokens);
      } catch (requestError) {
        showError(requestError);
      }
      return;
    }

    try {
      await requestCode(values);
    } catch (requestError) {
      showError(requestError);
    }
  };

  const verifyAndCreateAccount = async (value?: string) => {
    const code = (value ?? otp).trim();
    if (!pendingValues || code.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setError(null);
    setInfo(null);
    setIsVerifying(true);
    try {
      const verification = await authApi.verifyPasswordlessOtp(
        pendingValues.email,
        code,
        'sign_up',
      );
      if (verification.status !== 'profile_required') {
        throw new Error('Unexpected sign-up response');
      }
      const result = await authApi.completePasswordlessProfile({
        registrationToken: verification.registrationToken,
        firstName: pendingValues.firstName,
        lastName: pendingValues.lastName,
        phone: pendingValues.phone,
        gender: pendingValues.gender,
      });
      completeAuthentication(result.user, result.tokens);
    } catch (requestError) {
      showError(requestError);
    } finally {
      setIsVerifying(false);
    }
  };

  const authenticateWithGoogle = async (credential: string) => {
    setError(null);
    setErrorCode(undefined);
    setIsGoogleLoading(true);
    try {
      const result = await authApi.authenticateWithGoogle(
        credential,
        'sign_up',
      );
      if (result.status === 'profile_required') {
        setRegistrationToken(result.registrationToken);
        reset({
          firstName: result.profile.firstName,
          lastName: result.profile.lastName,
          email: result.profile.email,
          phone: '',
          gender: 'male',
        });
        setStep('google-details');
        setInfo(
          'Google verified your email. Add your phone and gender to finish creating your account.',
        );
      }
    } catch (requestError) {
      showError(requestError);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const resendCode = async () => {
    if (!pendingValues || cooldownRemaining > 0) return;
    try {
      await requestCode(pendingValues);
      setInfo('A new verification code has been sent.');
    } catch (requestError) {
      showError(requestError);
    }
  };

  const switchToSignIn = () => {
    if (onSwitchToSignIn) onSwitchToSignIn();
    else router.push('/sign-in');
  };

  const isGoogleDetails = step === 'google-details';

  return (
    <div className="mx-auto w-full max-w-md pt-2">
      <div className="mb-7 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {_copy('Create your SANAD account')}
        </p>
        <h1 className="font-display text-2xl font-normal tracking-tight text-primary">
          {_copy(
            step === 'otp'
              ? 'Verify your email'
              : isGoogleDetails
                ? 'Complete your profile'
                : 'Create a new account',
          )}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {_copy(
            step === 'otp'
              ? 'Enter the verification code to create your account.'
              : 'Use Google or enter your personal details below.',
          )}
        </p>
        {step === 'otp' ? (
          <p className="mt-2 font-semibold text-primary" dir="ltr">
            {_copy(maskedEmail || pendingValues?.email || '')}
          </p>
        ) : null}
      </div>

      {error ? (
        <Alert
          className="mb-5"
          description={
            <div className="space-y-3">
              <p>{_copy(error)}</p>
              {errorCode === 'EMAIL_EXISTS' ? (
                <Button onClick={switchToSignIn} size="sm" variant="outline">
                  {_copy('Sign in instead')}
                </Button>
              ) : null}
            </div>
          }
          title={_copy('Account creation failed')}
          variant="error"
        />
      ) : null}

      {info ? (
        <Alert className="mb-5" description={_copy(info)} variant="success" />
      ) : null}

      {step === 'otp' ? (
        <div className="space-y-5">
          <div className="rounded-lg border border-border/70 bg-surface-muted/35 px-3 py-5 sm:px-5">
            <OtpInput
              disabled={isVerifying}
              hasError={Boolean(error)}
              onChange={(value) => {
                setOtp(value);
                setError(null);
              }}
              onComplete={verifyAndCreateAccount}
              value={otp}
            />
          </div>
          <Button
            className="h-12 w-full"
            disabled={otp.length !== 6 || isVerifying}
            loading={isVerifying}
            loadingLabel={_copy('Creating account...')}
            onClick={() => verifyAndCreateAccount()}
            size="lg"
            type="button"
          >
            {_copy('Verify & Create Account')}
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
                setStep('details');
                setOtp('');
                setError(null);
                setInfo(null);
                if (pendingValues) reset(pendingValues);
              }}
              type="button"
            >
              {_copy('Edit your details')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {!isGoogleDetails ? (
            <>
              <GoogleAuthButton
                flow="sign_up"
                loading={isGoogleLoading}
                onCredential={authenticateWithGoogle}
                onError={(message) => setError(message)}
              />
              <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>{_copy('or sign up with email')}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}

          <form
            className="space-y-5"
            noValidate
            onSubmit={handleSubmit(submitDetails)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                error={_copy(errors.firstName?.message)}
                label={_copy('First name')}
                required
              >
                <Input
                  {...register('firstName')}
                  autoComplete="given-name"
                  disabled={isSubmitting}
                />
              </FormField>
              <FormField
                error={_copy(errors.lastName?.message)}
                label={_copy('Last name')}
                required
              >
                <Input
                  {...register('lastName')}
                  autoComplete="family-name"
                  disabled={isSubmitting}
                />
              </FormField>
            </div>

            <FormField
              description={
                isGoogleDetails
                  ? _copy(
                      'This email was verified by Google and cannot be changed.',
                    )
                  : undefined
              }
              error={_copy(errors.email?.message)}
              label={_copy('Email address')}
              required
            >
              <div className="relative">
                <Input
                  {...register('email')}
                  autoComplete="email"
                  className="dir-ltr ps-10 text-start"
                  placeholder={_copy('name@example.com')}
                  readOnly={isGoogleDetails}
                  type="email"
                />
                <Mail className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
              </div>
            </FormField>

            <FormField
              error={_copy(errors.phone?.message)}
              label={_copy('Phone number')}
              required
            >
              <div className="relative">
                <Input
                  {...register('phone')}
                  autoComplete="tel"
                  className="dir-ltr ps-10 text-start"
                  placeholder={_copy('+971 50 123 4567')}
                  type="tel"
                />
                <Phone className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
              </div>
            </FormField>

            <FormField
              error={_copy(errors.gender?.message)}
              label={_copy('Gender')}
              required
            >
              <select
                className="min-h-11 w-full rounded-md border border-[var(--control-border)] bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                {...register('gender')}
              >
                <option value="male">{_copy('Male')}</option>
                <option value="female">{_copy('Female')}</option>
              </select>
            </FormField>

            <Button
              className="h-12 w-full"
              loading={isSubmitting}
              loadingLabel={_copy('Creating account...')}
              size="lg"
              type="submit"
            >
              {_copy(
                isGoogleDetails ? 'Complete Google Sign Up' : 'Create Account',
              )}
            </Button>
          </form>
        </div>
      )}

      <p className="mt-7 border-t border-border pt-5 text-center text-sm text-muted-foreground">
        {_copy('Already have an account?')}{' '}
        <button
          className="font-semibold text-secondary underline underline-offset-4"
          onClick={switchToSignIn}
          type="button"
        >
          {_copy('Sign In')}
        </button>
      </p>
    </div>
  );
}
