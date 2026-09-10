'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  targetJobTitle: z.string().trim().max(255),
  targetIndustry: z.string().trim().max(255),
  targetCountry: z.string().trim().max(255),
  yearsOfExperience: z.string().trim().max(100),
  education: z.string().trim().max(500),
  keySkills: z.string().trim().max(1000),
  careerGoals: z.string().trim().max(2000),
  linkedinUrl: z.string().trim().max(500),
  portfolioUrl: z.string().trim().max(500),
});
type Values = z.infer<typeof schema>;
const profileKey = ['profile'] as const;

export function ProfileForm() {
  const _copy = useCopy();

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
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      gender: 'male',
      targetJobTitle: '',
      targetIndustry: '',
      targetCountry: '',
      yearsOfExperience: '',
      education: '',
      keySkills: '',
      careerGoals: '',
      linkedinUrl: '',
      portfolioUrl: '',
    },
  });
  useEffect(() => {
    if (query.data)
      reset({
        firstName: query.data.firstName ?? query.data.name.split(' ')[0] ?? '',
        lastName:
          query.data.lastName ?? query.data.name.split(' ').slice(1).join(' '),
        phone: query.data.phone ?? '',
        gender: query.data.gender === 'female' ? 'female' : 'male',
        targetJobTitle: query.data.careerProfile?.targetJobTitle ?? '',
        targetIndustry: query.data.careerProfile?.targetIndustry ?? '',
        targetCountry: query.data.careerProfile?.targetCountry ?? '',
        yearsOfExperience: query.data.careerProfile?.yearsOfExperience ?? '',
        education: query.data.careerProfile?.education ?? '',
        keySkills: query.data.careerProfile?.keySkills ?? '',
        careerGoals: query.data.careerProfile?.careerGoals ?? '',
        linkedinUrl: query.data.careerProfile?.linkedinUrl ?? '',
        portfolioUrl: query.data.careerProfile?.portfolioUrl ?? '',
      });
  }, [query.data, reset]);
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      profileApi.update({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        gender: values.gender,
        careerProfile: {
          targetJobTitle: values.targetJobTitle,
          targetIndustry: values.targetIndustry,
          targetCountry: values.targetCountry,
          yearsOfExperience: values.yearsOfExperience,
          education: values.education,
          keySkills: values.keySkills,
          careerGoals: values.careerGoals,
          linkedinUrl: values.linkedinUrl,
          portfolioUrl: values.portfolioUrl,
        },
      }),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey, profile);
      setSuccess(true);
    },
  });

  if (query.isPending)
    return (
      <div className="py-12 text-sm text-muted-foreground" role="status">
        {_copy('Loading your profile...')}
      </div>
    );
  if (query.error)
    return (
      <Alert
        title={_copy('Profile unavailable')}
        description={_copy(query.error.userMessage)}
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
          title={_copy('Profile updated')}
          description={_copy(
            'Your contact and career details have been saved.',
            'تم حفظ بيانات التواصل والبيانات المهنية.',
          )}
          variant="success"
        />
      ) : null}
      {mutation.error ? (
        <Alert
          className="mb-6"
          title={_copy('Could not save profile')}
          description={_copy(
            isApiError(mutation.error)
              ? mutation.error.userMessage
              : 'Please try again.',
          )}
          variant="error"
        />
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          {_copy('First Name')}
          <Input
            {...register('firstName')}
            invalid={Boolean(errors.firstName)}
          />
          {errors.firstName ? (
            <span className="text-xs text-error">
              {_copy(errors.firstName.message)}
            </span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          {_copy('Last Name')}
          <Input {...register('lastName')} invalid={Boolean(errors.lastName)} />
          {errors.lastName ? (
            <span className="text-xs text-error">
              {_copy(errors.lastName.message)}
            </span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          {_copy('Email')}
          <Input type="email" readOnly value={query.data.email} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          {_copy('Phone Number')}
          <Input
            type="tel"
            {...register('phone')}
            invalid={Boolean(errors.phone)}
          />
          {errors.phone ? (
            <span className="text-xs text-error">
              {_copy(errors.phone.message)}
            </span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
          {_copy('Gender')}
          <select
            className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
            {...register('gender')}
          >
            <option value="male">{_copy('Male')}</option>
            <option value="female">{_copy('Female')}</option>
          </select>
          {errors.gender ? (
            <span className="text-xs text-error">
              {_copy(errors.gender.message)}
            </span>
          ) : null}
        </label>
      </div>
      <section className="mt-8 border-t border-border pt-7">
        <h2 className="type-h4 text-primary">{_copy('Career profile')}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {_copy(
            'These details are reused in future service orders so you do not need to enter them again.',
          )}
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            {_copy('Target job title')}
            <Input {...register('targetJobTitle')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {_copy('Target industry')}
            <Input {...register('targetIndustry')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {_copy('Target country')}
            <Input {...register('targetCountry')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {_copy('Years of experience')}
            <Input {...register('yearsOfExperience')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            {_copy('Education')}
            <Textarea {...register('education')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            {_copy('Key skills')}
            <Textarea {...register('keySkills')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            {_copy('Career goals')}
            <Textarea {...register('careerGoals')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {_copy('LinkedIn profile URL')}
            <Input type="url" {...register('linkedinUrl')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {_copy('Portfolio URL')}
            <Input type="url" {...register('portfolioUrl')} />
          </label>
        </div>
      </section>
      <div className="mt-7 border-t border-border pt-6">
        <Button
          loading={mutation.isPending}
          loadingLabel={_copy('Saving profile')}
          type="submit"
        >
          {_copy(mutation.isPending ? 'Saving...' : 'Save changes')}
        </Button>
      </div>
    </form>
  );
}
