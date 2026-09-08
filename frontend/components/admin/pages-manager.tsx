'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { adminApi, adminKeys, type CmsPage } from '@/lib/api';

import { AdminPageHeader, AdminTable, DataState } from './admin-ui';
const schema = z.object({
  title_en: z.string().trim().min(2),
  title_ar: z.string().trim().min(2),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Use lowercase letters, numbers, and hyphens.',
    ),
  content_en: z.string(),
  content_ar: z.string(),
  meta_en: z.string().max(500),
  meta_ar: z.string().max(500),
  active: z.boolean(),
});
type Values = z.infer<typeof schema>;
const empty: Values = {
  title_en: '',
  title_ar: '',
  slug: '',
  content_en: '',
  content_ar: '',
  meta_en: '',
  meta_ar: '',
  active: true,
};
export function PagesManager() {
  const _copy = useCopy();

  const client = useQueryClient();
  const [editing, setEditing] = useState<CmsPage | null | undefined>(undefined);
  const params = { page: 1, limit: 100 };
  const query = useQuery({
    queryKey: adminKeys.list('pages', params),
    queryFn: ({ signal }) => adminApi.pages.list(params, { signal }),
  });
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty });
  const active = useWatch({ control, name: 'active' });
  useEffect(() => {
    if (editing === null) reset(empty);
    else if (editing)
      reset({
        title_en: editing.title_en,
        title_ar: editing.title_ar ?? '',
        slug: editing.slug,
        content_en: editing.content_en ?? '',
        content_ar: editing.content_ar ?? '',
        meta_en: editing.meta_description_en ?? '',
        meta_ar: editing.meta_description_ar ?? '',
        active: editing.is_active !== false,
      });
  }, [editing, reset]);
  const save = useMutation({
    mutationFn: (values: Values) => {
      const input = {
        title_en: values.title_en,
        title_ar: values.title_ar,
        slug: values.slug,
        content_en: values.content_en,
        content_ar: values.content_ar,
        meta_description_en: values.meta_en,
        meta_description_ar: values.meta_ar,
        is_active: values.active,
      };
      return editing
        ? adminApi.pages.update(editing.id, input)
        : adminApi.pages.create(input);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'pages'] });
      setEditing(undefined);
    },
  });
  return (
    <>
      <AdminPageHeader
        title={_copy('Pages')}
        description={_copy(
          'Edit the English content and publication state of SANAD’s CMS pages.',
        )}
        action={
          <Button onClick={() => setEditing(null)}>{_copy('Add Page')}</Button>
        }
      />
      <DataState
        loading={query.isPending}
        error={_copy(query.error?.userMessage)}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[700px] text-start text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">{_copy('Title')}</th>
                <th className="px-4 py-3">{_copy('Slug')}</th>
                <th className="px-4 py-3">{_copy('Status')}</th>
                <th className="px-4 py-3">{_copy('Updated')}</th>
                <th className="px-4 py-3">{_copy('Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-4 font-semibold text-primary">
                    <div>{_copy(p.title_en)}</div>
                    {p.title_ar ? (
                      <div className="text-xs font-normal text-muted-foreground">
                        {p.title_ar}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs">
                    {_copy('/')}
                    {_copy(p.slug)}
                  </td>
                  <td className="px-4 py-4">
                    {_copy(p.is_active ? 'Published' : 'Draft')}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {_copy(_copy.date(p.updated_at))}
                  </td>
                  <td className="px-4 py-4">
                    <Button
                      aria-label={_copy('Edit page')}
                      onClick={() => setEditing(p)}
                      size="icon"
                      variant="outline"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTable>
      </DataState>
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {_copy(editing ? 'Edit Page' : 'Add Page')}
            </DialogTitle>
            <DialogDescription>
              {_copy(
                'Manage page title, slug, meta description, and localized English and Arabic content.',
              )}
            </DialogDescription>
          </DialogHeader>
          {save.error ? (
            <Alert
              title={_copy('Could not save page')}
              description={_copy(save.error.userMessage)}
              variant="error"
            />
          ) : null}
          <form
            className="grid gap-4"
            onSubmit={handleSubmit((v) => save.mutate(v))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">
                {_copy('English Title')}
                <Input
                  {...register('title_en')}
                  invalid={Boolean(errors.title_en)}
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                {_copy('Arabic Title')}
                <Input
                  dir="rtl"
                  {...register('title_ar')}
                  invalid={Boolean(errors.title_ar)}
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('Slug')}
              <Input {...register('slug')} invalid={Boolean(errors.slug)} />
              {errors.slug ? (
                <span className="text-xs text-error">
                  {_copy(errors.slug.message)}
                </span>
              ) : null}
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('English Content')}
              <Textarea
                className="min-h-48 font-mono text-sm"
                {...register('content_en')}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('Arabic Content')}
              <Textarea
                className="min-h-48 font-mono text-sm"
                dir="rtl"
                {...register('content_ar')}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">
                {_copy('English Meta Description')}
                <Textarea {...register('meta_en')} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                {_copy('Arabic Meta Description')}
                <Textarea dir="rtl" {...register('meta_ar')} />
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <Switch
                checked={active}
                onCheckedChange={(v) => setValue('active', v)}
              />
              {_copy('Published')}
            </label>
            <DialogFooter>
              <Button onClick={() => setEditing(undefined)} variant="outline">
                {_copy('Cancel')}
              </Button>
              <Button loading={save.isPending} type="submit">
                {_copy(save.isPending ? 'Saving...' : 'Save Page')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
