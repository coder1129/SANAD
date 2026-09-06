'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  ArrowRight,
  ArrowLeft,
  Mail,
  CheckCircle2,
  RefreshCw,
  Phone,
} from 'lucide-react';

import type { User, AuthTokens } from '@/types/domain';
import { authApi } from '@/lib/api';
import { ApiError } from '@/lib/api/errors';
import { establishAuthenticatedSession } from '@/lib/auth/auth-session';
import { sanitizeRedirectPath } from '@/lib/auth/redirect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Alert } from '@/components/ui/alert';
import { OtpInput } from '@/components/auth/otp-input';

type Step = 'email' | 'otp' | 'profile';

const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address')
    .max(255),
});

type EmailFormValues = z.infer<typeof emailSchema>;

const profileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name is too long')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long')
    .trim(),
  phone: z
    .string()
    .min(5, 'Please enter a valid phone number')
    .max(20, 'Phone number is too long')
    .regex(/^[\d\s+\-()]+$/, 'Invalid phone number format')
    .trim(),
  gender: z.enum(['male', 'female'], {
    message: 'Please select your gender',
  }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function SignInFlow({
  nextTarget: modalTarget,
  onComplete,
}: { nextTarget?: string; onComplete?: () => void } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = modalTarget ?? searchParams.get('next');

  const [step, setStep] = React.useState<Step>('email');
  const [email, setEmail] = React.useState('');
  const [maskedEmail, setMaskedEmail] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [registrationToken, setRegistrationToken] = React.useState('');
  const [cooldownRemaining, setCooldownRemaining] = React.useState(0);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null);
  const [isAdminBlocked, setIsAdminBlocked] = React.useState(false);
  const [selectedGender, setSelectedGender] = React.useState<'male' | 'female'>(
    'male',
  );
  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);
  const stepNumber = step === 'email' ? 1 : step === 'otp' ? 2 : 3;

  // Email Form
  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors, isSubmitting: isSendingCode },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    setValue: setProfileValue,
    formState: { errors: profileErrors, isSubmitting: isCompletingProfile },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      gender: 'male',
    },
  });

  // Cooldown countdown timer
  React.useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Navigate to destination on successful login
  const completeAuthentication = React.useCallback(
    (user: User, tokens: AuthTokens) => {
      establishAuthenticatedSession({ user, tokens });
      onComplete?.();
      const target = sanitizeRedirectPath(nextTarget, '/my-orders');
      router.replace(target);
    },
    [nextTarget, onComplete, router],
  );

  // Step 1: Submit Email
  const onEmailSubmit = async (values: EmailFormValues) => {
    setGeneralError(null);
    setInfoMessage(null);
    setIsAdminBlocked(false);

    try {
      const result = await authApi.requestPasswordlessOtp(values.email);
      setEmail(values.email.toLowerCase().trim());
      setMaskedEmail(result.email);
      setStep('otp');
      setOtp('');
      setCooldownRemaining(60);
      setInfoMessage(
        'A 6-digit verification code has been sent to your email.',
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setGeneralError('Please wait before requesting another code.');
          setCooldownRemaining(60);
          return;
        }
        setGeneralError(
          err.message || 'Unable to send verification code. Please try again.',
        );
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
    }
  };

  // Step 2: Verify OTP
  const onVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otp).trim();
    if (code.length !== 6) {
      setGeneralError('Please enter the full 6-digit verification code.');
      return;
    }

    setGeneralError(null);
    setInfoMessage(null);
    setIsVerifyingOtp(true);

    try {
      const result = await authApi.verifyPasswordlessOtp(email, code);

      if (result.status === 'authenticated') {
        completeAuthentication(result.user, result.tokens);
        return;
      }

      if (result.status === 'profile_required') {
        setRegistrationToken(result.registrationToken);
        setStep('profile');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (
          err.message.includes('administrator') ||
          err.code === 'ADMIN_SIGN_IN_REQUIRED'
        ) {
          setIsAdminBlocked(true);
          setGeneralError(
            'This account is registered as an administrator. Please use the administrator sign-in page.',
          );
          return;
        }
        setGeneralError(
          err.message || 'Incorrect or expired verification code.',
        );
      } else {
        setGeneralError('Verification failed. Please try again.');
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend OTP
  const handleResendCode = async () => {
    if (cooldownRemaining > 0 || isSendingCode) return;
    setGeneralError(null);
    setInfoMessage(null);

    try {
      const result = await authApi.requestPasswordlessOtp(email);
      setMaskedEmail(result.email);
      setCooldownRemaining(60);
      setOtp('');
      setInfoMessage('A new verification code has been sent.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setGeneralError('Please wait before requesting another code.');
        setCooldownRemaining(60);
      } else {
        setGeneralError('Unable to resend code. Please try again later.');
      }
    }
  };

  // Change Email
  const handleChangeEmail = () => {
    setStep('email');
    setOtp('');
    setGeneralError(null);
    setInfoMessage(null);
    setIsAdminBlocked(false);
  };

  // Step 3: Complete Profile
  const onProfileSubmit = async (values: ProfileFormValues) => {
    setGeneralError(null);

    try {
      const result = await authApi.completePasswordlessProfile({
        registrationToken,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        gender: values.gender,
      });

      completeAuthentication(result.user, result.tokens);
    } catch (err) {
      if (err instanceof ApiError) {
        if (
          err.message.includes('expired') ||
          err.code === 'INVALID_REGISTRATION_TOKEN'
        ) {
          setGeneralError(
            'Your verification session has expired. Please sign in again.',
          );
          setTimeout(() => {
            setStep('email');
          }, 2000);
          return;
        }
        setGeneralError(
          err.message || 'Failed to complete profile. Please try again.',
        );
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-md pt-2">
      {/* Back button when in OTP step */}
      {step === 'otp' && (
        <div className="mb-5">
          <button
            type="button"
            onClick={handleChangeEmail}
            className="group inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Change email address</span>
          </button>
        </div>
      )}

      {/* Step Header */}
      <div className="mb-7 text-center">
        <div
          className="mx-auto mb-6 flex max-w-[22rem] items-center gap-3 px-9 text-xs"
          aria-label={`Step ${stepNumber} of 3`}
        >
          <span className="font-semibold tabular-nums text-primary">
            0{stepNumber}
          </span>
          <div
            className="h-px flex-1 overflow-hidden bg-border"
            aria-hidden="true"
          >
            <motion.div
              className="h-full origin-left bg-accent"
              initial={false}
              animate={{ width: `${(stepNumber / 3) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <span className="tabular-nums text-muted-foreground">03</span>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {step === 'email' && 'Step 1: Quick Sign-In'}
          {step === 'otp' && 'Step 2: Verification'}
          {step === 'profile' && 'Step 3: Account Profile'}
        </p>

        <h1
          className="font-display text-2xl font-normal tracking-tight text-primary"
          id="auth-step-title"
        >
          {step === 'email' && 'Welcome to SANAD'}
          {step === 'otp' && 'Check your email'}
          {step === 'profile' && 'Complete your profile'}
        </h1>

        <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {step === 'email' && (
            <p>
              Enter your email to sign in or create your account without a
              password.
            </p>
          )}
          {step === 'otp' && (
            <div className="mt-1 flex flex-col items-center gap-2">
              <p>We sent a 6-digit verification code to:</p>
              <div className="inline-flex items-center gap-2 border-b border-accent/50 pb-1 text-xs font-semibold text-primary sm:text-sm">
                <Mail className="size-3.5 shrink-0 text-accent" />
                <span dir="ltr">{maskedEmail || email}</span>
              </div>
            </div>
          )}
          {step === 'profile' && (
            <p>
              Tell us a little about yourself to finish setting up your
              consultation profile.
            </p>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {generalError ? (
        <div className="mb-6">
          <Alert
            variant="error"
            title={isAdminBlocked ? 'Administrator Account' : 'Action Failed'}
            description={
              <div className="space-y-2 mt-1">
                <p>{generalError}</p>
                {isAdminBlocked && (
                  <div className="pt-2 border-t border-error/20">
                    <Link
                      href="/admin/sign-in"
                      className="inline-flex items-center gap-1.5 font-semibold text-primary underline hover:text-secondary text-xs"
                    >
                      Go to Staff &amp; Administrator Portal &rarr;
                    </Link>
                  </div>
                )}
              </div>
            }
          />
        </div>
      ) : null}

      {infoMessage ? (
        <div className="mb-6">
          <Alert variant="success" description={infoMessage} />
        </div>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {/* STEP 1: EMAIL */}
        {step === 'email' && (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: 60, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -60, y: -8 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <form
              onSubmit={handleEmailSubmit(onEmailSubmit)}
              className="space-y-6"
              noValidate
            >
              <FormField
                label="Email address"
                error={emailErrors.email?.message}
                required
              >
                <div className="relative">
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    disabled={isSendingCode}
                    className="dir-ltr pl-10 text-left"
                    {...registerEmail('email')}
                  />
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                    <Mail className="size-4" />
                  </span>
                </div>
              </FormField>

              <Button
                type="submit"
                size="lg"
                className="h-12 w-full cursor-pointer text-base font-semibold shadow-xs transition-all hover:shadow-md"
                loading={isSendingCode}
                loadingLabel="Sending code..."
              >
                Continue with Email
                <ArrowRight className="size-4 shrink-0" />
              </Button>
            </form>
          </motion.div>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 60, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -60, y: -8 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="space-y-6">
              <div className="rounded-lg border border-border/70 bg-surface-muted/35 px-3 py-5 sm:px-5">
                <OtpInput
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (generalError) setGeneralError(null);
                  }}
                  onComplete={(code) => {
                    onVerifyOtp(code);
                  }}
                  hasError={Boolean(generalError)}
                  disabled={isVerifyingOtp}
                />
              </div>

              <Button
                type="button"
                size="lg"
                className="h-12 w-full cursor-pointer text-base font-semibold shadow-xs transition-all hover:shadow-md"
                disabled={otp.length !== 6 || isVerifyingOtp}
                loading={isVerifyingOtp}
                loadingLabel="Verifying code..."
                onClick={() => onVerifyOtp()}
              >
                Verify &amp; Continue
                <CheckCircle2 className="size-4 shrink-0" />
              </Button>

              {/* Resend & Actions Bar */}
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-4 text-xs sm:flex-row">
                <div>
                  {cooldownRemaining > 0 ? (
                    <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                      <span>Resend code in:</span>
                      <span className="rounded border border-border bg-surface px-2 py-0.5 font-mono font-bold text-primary">
                        {cooldownRemaining}s
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isSendingCode}
                      onClick={handleResendCode}
                      className="flex cursor-pointer items-center gap-1 font-semibold text-secondary transition-colors hover:text-primary hover:underline"
                    >
                      <RefreshCw className="size-3.5" />
                      <span>Didn&apos;t receive code? Resend</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="cursor-pointer text-muted-foreground underline underline-offset-4 transition-colors hover:text-primary"
                >
                  Use a different email
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: PROFILE COMPLETION */}
        {step === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 60, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -60, y: -8 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <form
              onSubmit={handleProfileSubmit(onProfileSubmit)}
              className="space-y-5"
              noValidate
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="First name"
                  error={profileErrors.firstName?.message}
                  required
                >
                  <Input
                    type="text"
                    autoComplete="given-name"
                    placeholder="e.g. Alexander"
                    disabled={isCompletingProfile}
                    {...registerProfile('firstName')}
                  />
                </FormField>

                <FormField
                  label="Last name"
                  error={profileErrors.lastName?.message}
                  required
                >
                  <Input
                    type="text"
                    autoComplete="family-name"
                    placeholder="e.g. Al Mansoori"
                    disabled={isCompletingProfile}
                    {...registerProfile('lastName')}
                  />
                </FormField>
              </div>

              <FormField
                label="Phone number"
                error={profileErrors.phone?.message}
                required
                description="Used for order notifications and document consultation updates."
              >
                <div className="relative">
                  <Input
                    type="tel"
                    autoComplete="tel"
                    placeholder="+971 50 123 4567"
                    disabled={isCompletingProfile}
                    className="dir-ltr pl-10 text-left"
                    {...registerProfile('phone')}
                  />
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                    <Phone className="size-4" />
                  </span>
                </div>
              </FormField>

              <div className="space-y-3">
                <label className="type-label block text-foreground">
                  Gender <span className="text-error">*</span>
                </label>
                <div
                  className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-muted/50 p-1"
                  role="radiogroup"
                  aria-label="Gender selection"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedGender === 'male'}
                    onClick={() => {
                      setSelectedGender('male');
                      setProfileValue('gender', 'male', {
                        shouldValidate: true,
                      });
                    }}
                    className={`flex min-h-11 cursor-pointer items-center justify-between rounded-md px-3 py-2.5 text-left transition-all ${
                      selectedGender === 'male'
                        ? 'bg-surface text-primary shadow-xs font-semibold'
                        : 'text-foreground/80 hover:bg-surface/70'
                    }`}
                  >
                    <span className="text-sm">Male</span>
                    <div
                      className={`grid size-4 place-items-center rounded-full border ${
                        selectedGender === 'male'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-surface'
                      }`}
                    >
                      {selectedGender === 'male' && (
                        <span className="size-1.5 rounded-full bg-surface" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedGender === 'female'}
                    onClick={() => {
                      setSelectedGender('female');
                      setProfileValue('gender', 'female', {
                        shouldValidate: true,
                      });
                    }}
                    className={`flex min-h-11 cursor-pointer items-center justify-between rounded-md px-3 py-2.5 text-left transition-all ${
                      selectedGender === 'female'
                        ? 'bg-surface text-primary shadow-xs font-semibold'
                        : 'text-foreground/80 hover:bg-surface/70'
                    }`}
                  >
                    <span className="text-sm">Female</span>
                    <div
                      className={`grid size-4 place-items-center rounded-full border ${
                        selectedGender === 'female'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-surface'
                      }`}
                    >
                      {selectedGender === 'female' && (
                        <span className="size-1.5 rounded-full bg-surface" />
                      )}
                    </div>
                  </button>
                </div>
                {profileErrors.gender && (
                  <p className="mt-1 text-xs font-medium text-error">
                    {profileErrors.gender.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="mt-4 h-12 w-full cursor-pointer text-base font-semibold shadow-xs transition-all hover:shadow-md"
                loading={isCompletingProfile}
                loadingLabel="Creating account..."
              >
                Complete Account &amp; Continue
                <ArrowRight className="size-4 shrink-0" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
