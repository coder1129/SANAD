'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { isApiError } from '@/lib/api';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});
type Values = z.infer<typeof schema>;
export function AdminSignInForm() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  return (
    <form
      className="mt-8 grid gap-5"
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          const result = await login(values);
          if (!['admin', 'super_admin'].includes(result.user.role)) {
            await logout();
            setError(
              'This account is not authorized for SANAD administration.',
            );
            return;
          }
          router.replace('/admin');
        } catch (requestError) {
          setError(
            isApiError(requestError)
              ? requestError.userMessage
              : 'Sign in failed. Please try again.',
          );
        }
      })}
    >
      {error ? (
        <Alert title="Access denied" description={error} variant="error" />
      ) : null}
      <label className="grid gap-2 text-sm font-semibold">
        Email
        <Input
          autoComplete="username"
          {...register('email')}
          invalid={Boolean(errors.email)}
        />
        {errors.email ? (
          <span className="text-xs text-error">{errors.email.message}</span>
        ) : null}
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Password
        <Input
          autoComplete="current-password"
          type="password"
          {...register('password')}
          invalid={Boolean(errors.password)}
        />
        {errors.password ? (
          <span className="text-xs text-error">{errors.password.message}</span>
        ) : null}
      </label>
      <Button
        loading={isSubmitting}
        loadingLabel="Signing in"
        size="lg"
        type="submit"
      >
        {isSubmitting ? 'Signing in...' : 'Sign in to Admin'}
      </Button>
    </form>
  );
}
