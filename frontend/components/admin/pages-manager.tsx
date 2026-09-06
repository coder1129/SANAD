'use client';

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
import { formatDate } from '@/lib/orders/presentation';
import { AdminPageHeader, AdminTable, DataState } from './admin-ui';
const schema = z.object({
  title: z.string().trim().min(2),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Use lowercase letters, numbers, and hyphens.',
    ),
  content: z.string(),
  meta: z.string().max(500),
  active: z.boolean(),
});
type Values = z.infer<typeof schema>;
const empty: Values = {
  title: '',
  slug: '',
  content: '',
  meta: '',
  active: true,
};
export function PagesManager() {
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
        title: editing.title_en,
        slug: editing.slug,
        content: editing.content_en ?? '',
        meta: editing.meta_description_en ?? '',
        active: editing.is_active !== false,
      });
  }, [editing, reset]);
  const save = useMutation({
    mutationFn: (values: Values) => {
      const input = {
        title_en: values.title,
        title_ar: values.title,
        slug: values.slug,
        content_en: values.content,
        content_ar: values.content,
        meta_description_en: values.meta,
        meta_description_ar: values.meta,
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
        title="Pages"
        description="Edit the English content and publication state of SANAD’s CMS pages."
        action={<Button onClick={() => setEditing(null)}>Add Page</Button>}
      />
      <DataState
        loading={query.isPending}
        error={query.error?.userMessage}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-4 font-semibold text-primary">
                    {p.title_en}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs">/{p.slug}</td>
                  <td className="px-4 py-4">
                    {p.is_active ? 'Published' : 'Draft'}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDate(p.updated_at)}
                  </td>
                  <td className="px-4 py-4">
                    <Button
                      aria-label="Edit page"
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
            <DialogTitle>{editing ? 'Edit Page' : 'Add Page'}</DialogTitle>
            <DialogDescription>
              Content is stored as CMS text and sanitized by the existing public
              rendering layer.
            </DialogDescription>
          </DialogHeader>
          {save.error ? (
            <Alert
              title="Could not save page"
              description={save.error.userMessage}
              variant="error"
            />
          ) : null}
          <form
            className="grid gap-4"
            onSubmit={handleSubmit((v) => save.mutate(v))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">
                Title
                <Input {...register('title')} invalid={Boolean(errors.title)} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Slug
                <Input {...register('slug')} invalid={Boolean(errors.slug)} />
                {errors.slug ? (
                  <span className="text-xs text-error">
                    {errors.slug.message}
                  </span>
                ) : null}
              </label>
            </div>
            <label className="grid gap-1 text-sm font-semibold">
              Content
              <Textarea
                className="min-h-64 font-mono text-sm"
                {...register('content')}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Meta Description
              <Textarea {...register('meta')} />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <Switch
                checked={active}
                onCheckedChange={(v) => setValue('active', v)}
              />
              Published
            </label>
            <DialogFooter>
              <Button onClick={() => setEditing(undefined)} variant="outline">
                Cancel
              </Button>
              <Button loading={save.isPending} type="submit">
                {save.isPending ? 'Saving...' : 'Save Page'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
