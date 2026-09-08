'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi, adminKeys, settingsKeys, type SiteSetting } from '@/lib/api';
import { AdminPageHeader, DataState } from './admin-ui';
const schema = z
  .record(z.string(), z.string().max(10000))
  .superRefine((values, context) => {
    const whatsapp = values.whatsapp_number?.trim();
    const whatsappDigits = whatsapp?.replace(/\D/g, '') ?? '';
    if (
      whatsapp &&
      (!/^\+?[0-9 ()-]+$/.test(whatsapp) ||
        whatsappDigits.length < 8 ||
        whatsappDigits.length > 15)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['whatsapp_number'],
        message: 'Enter a valid international WhatsApp number.',
      });
    }
    const supportEmail = values.support_email?.trim();
    if (supportEmail && !z.email().safeParse(supportEmail).success) {
      context.addIssue({
        code: 'custom',
        path: ['support_email'],
        message: 'Enter a valid support email.',
      });
    }
    for (const key of [
      'facebook_url',
      'twitter_url',
      'linkedin_url',
      'instagram_url',
    ]) {
      const value = values[key]?.trim();
      if (value && !z.url({ protocol: /^https?$/ }).safeParse(value).success) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'Enter a complete http or https URL.',
        });
      }
    }
    const currency = values.currency?.trim();
    if (currency && !/^[A-Z]{3}$/.test(currency)) {
      context.addIssue({
        code: 'custom',
        path: ['currency'],
        message: 'Use a three-letter uppercase currency code.',
      });
    }
  });
type Values = z.infer<typeof schema>;
const labels: Record<string, string> = {
  site_name: 'Site Name (Arabic)',
  site_name_en: 'Site Name (English)',
  support_email: 'Support Email',
  support_phone: 'Support Phone',
  whatsapp_number: 'WhatsApp Number',
  currency: 'Currency',
  facebook_url: 'Facebook URL',
  twitter_url: 'X / Twitter URL',
  linkedin_url: 'LinkedIn URL',
  instagram_url: 'Instagram URL',
};

function settingsFields(existing: SiteSetting[]): SiteSetting[] {
  const existingKeys = new Set(existing.map((item) => item.setting_key));
  return [
    ...existing,
    ...Object.keys(labels)
      .filter((key) => !existingKeys.has(key))
      .map((key, index) => ({
        id: -(index + 1),
        setting_key: key,
        setting_value: '',
        setting_type: 'string',
        description:
          key === 'whatsapp_number'
            ? 'Central WhatsApp number used by order handoff actions'
            : null,
      })),
  ];
}

export function SettingsForm() {
  const _copy = useCopy();

  const client = useQueryClient();
  const query = useQuery({
    queryKey: adminKeys.settings,
    queryFn: ({ signal }) => adminApi.settings.list({ signal }),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {},
  });
  useEffect(() => {
    if (query.data)
      reset(
        Object.fromEntries(
          settingsFields(query.data).map((item) => [
            item.setting_key,
            item.setting_value ?? '',
          ]),
        ),
      );
  }, [query.data, reset]);
  const save = useMutation({
    mutationFn: adminApi.settings.update,
    onSuccess: (settings) => {
      client.setQueryData(adminKeys.settings, settings);
      void client.invalidateQueries({ queryKey: settingsKeys.public });
    },
  });
  return (
    <>
      <AdminPageHeader
        title={_copy('Settings')}
        description={_copy(
          'Edit the system settings that already exist. WhatsApp handoff reads the central whatsapp_number value here.',
        )}
      />
      <DataState
        loading={query.isPending}
        error={_copy(query.error?.userMessage)}
      >
        {query.data ? (
          <form
            className="max-w-3xl border border-border bg-surface p-6 sm:p-8"
            onSubmit={handleSubmit((v) => save.mutate(v))}
          >
            {save.isSuccess ? (
              <Alert
                className="mb-5"
                title={_copy('Settings saved')}
                description={_copy(
                  'Public contact and checkout configuration has been refreshed.',
                )}
                variant="success"
              />
            ) : null}
            {save.error ? (
              <Alert
                className="mb-5"
                title={_copy('Could not save settings')}
                description={_copy(save.error.userMessage)}
                variant="error"
              />
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2">
              {settingsFields(query.data).map((item) => (
                <label
                  className="grid gap-2 text-sm font-semibold"
                  key={item.setting_key}
                >
                  {_copy(
                    labels[item.setting_key] ??
                      item.setting_key
                        .replaceAll('_', ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase()),
                  )}
                  <Input
                    dir={item.setting_key === 'site_name' ? 'rtl' : undefined}
                    {...register(item.setting_key)}
                  />
                  {errors[item.setting_key]?.message ? (
                    <span className="font-normal text-xs text-error">
                      {_copy(String(errors[item.setting_key]?.message))}
                    </span>
                  ) : null}
                  <span className="font-normal text-xs text-muted-foreground">
                    {_copy(
                      item.description ?? item.setting_type ?? 'Setting value',
                    )}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-7 border-t border-border pt-6">
              <Button loading={save.isPending} type="submit">
                {_copy(save.isPending ? 'Saving...' : 'Save Settings')}
              </Button>
            </div>
          </form>
        ) : null}
      </DataState>
    </>
  );
}
