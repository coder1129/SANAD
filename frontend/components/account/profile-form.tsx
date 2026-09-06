'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, profileApi } from '@/lib/api';

const schema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(100),
  lastName: z.string().trim().min(1, 'Last name is required.').max(100),
  phone: z
    .string()
    .trim()
    .min(5, 'Enter a valid phone number.')
    .max(20)
    .regex(/^[\d\s+()\-]+$/, 'Enter a valid phone number.'),
  gender: z.enum(['male', 'female'], { message: 'Select a gender.' }),
});
type Values = z.infer<typeof schema>;
const profileKey = ['profile'] as const;

export function ProfileForm() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const query = useQuery({
    queryKey: profileKey,
    queryFn: ({ signal }) => profileApi.get({ signal }),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', phone: '', gender: 'male' },
  });
  useEffect(() => {
    if (query.data)
      reset({
        firstName: query.data.firstName ?? query.data.name.split(' ')[0] ?? '',
        lastName:
          query.data.lastName ?? query.data.name.split(' ').slice(1).join(' '),
        phone: query.data.phone ?? '',
        gender: query.data.gender === 'female' ? 'female' : 'male',
      });
  }, [query.data, reset]);
  const mutation = useMutation({
    mutationFn: profileApi.update,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey, profile);
      setSuccess(true);
    },
  });

  if (query.isPending)
    return (
      <div className="py-12 text-sm text-muted-foreground" role="status">
        Loading your profile...
      </div>
    );
  if (query.error)
    return (
      <Alert
        title="Profile unavailable"
        description={query.error.userMessage}
        variant="error"
      />
    );
  if (!query.data) return null;

  return (
    <form
      className="max-w-3xl border border-border bg-surface p-6 shadow-sm sm:p-8"
      onSubmit={handleSubmit((values) => {
        setSuccess(false);
        mutation.mutate(values);
      })}
    >
      {success ? (
        <Alert
          className="mb-6"
          title="Profile updated"
          description="Your contact details have been saved."
          variant="success"
        />
      ) : null}
      {mutation.error ? (
        <Alert
          className="mb-6"
          title="Could not save profile"
          description={
            isApiError(mutation.error)
              ? mutation.error.userMessage
              : 'Please try again.'
          }
          variant="error"
        />
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          First Name
          <Input
            {...register('firstName')}
            invalid={Boolean(errors.firstName)}
          />
          {errors.firstName ? (
            <span className="text-xs text-error">
              {errors.firstName.message}
            </span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Last Name
          <Input {...register('lastName')} invalid={Boolean(errors.lastName)} />
          {errors.lastName ? (
            <span className="text-xs text-error">
              {errors.lastName.message}
            </span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Email
          <Input readOnly value={query.data.email} />
          <span className="font-normal text-xs text-muted-foreground">
            Email is your passwordless identity and cannot be changed here.
          </span>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Phone Number
          <Input {...register('phone')} invalid={Boolean(errors.phone)} />
          {errors.phone ? (
            <span className="text-xs text-error">{errors.phone.message}</span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
          Gender
          <select
            className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
            {...register('gender')}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {errors.gender ? (
            <span className="text-xs text-error">{errors.gender.message}</span>
          ) : null}
        </label>
      </div>
      <div className="mt-7 border-t border-border pt-6">
        <Button
          loading={mutation.isPending}
          loadingLabel="Saving profile"
          type="submit"
        >
          {mutation.isPending ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
