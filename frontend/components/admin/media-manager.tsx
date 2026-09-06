'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi, adminKeys, type SiteMedia } from '@/lib/api';
import { formatDate } from '@/lib/orders/presentation';
import { AdminPageHeader, ConfirmDialog, DataState } from './admin-ui';
const schema = z.object({
  mediaKey: z
    .string()
    .regex(
      /^[a-z0-9_-]+$/,
      'Use lowercase letters, numbers, underscores, or hyphens.',
    ),
  altText: z.string().trim().min(2),
});
type Values = z.infer<typeof schema>;
export function MediaManager() {
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState<SiteMedia | null>(null);
  const query = useQuery({
    queryKey: adminKeys.list('media'),
    queryFn: ({ signal }) => adminApi.media.list({ signal }),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { mediaKey: '', altText: '' },
  });
  const upload = useMutation({
    mutationFn: (values: Values) => {
      if (!file) throw new Error('Select an image');
      return adminApi.media.upload(file, values);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'media'] });
      setFile(null);
      reset();
    },
  });
  const remove = useMutation({
    mutationFn: (item: SiteMedia) => adminApi.media.remove(item.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'media'] });
      setDeleting(null);
    },
  });
  const update = useMutation({
    mutationFn: ({ id, alt }: { id: number; alt: string }) =>
      adminApi.media.update(id, { alt_text_en: alt }),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ['admin', 'media'] }),
  });
  return (
    <>
      <AdminPageHeader
        title="Media"
        description="Upload and maintain site imagery, filenames, types, alt text, and publication state."
      />
      <form
        className="mb-7 grid gap-3 border border-border bg-surface p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        onSubmit={handleSubmit((v) => upload.mutate(v))}
      >
        <label className="grid gap-1 text-sm font-semibold">
          Image
          <Input
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            type="file"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Media Key
          <Input {...register('mediaKey')} invalid={Boolean(errors.mediaKey)} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Alt Text
          <Input {...register('altText')} invalid={Boolean(errors.altText)} />
        </label>
        <Button disabled={!file} loading={upload.isPending} type="submit">
          {upload.isPending ? 'Uploading...' : 'Upload'}
        </Button>
        {upload.error ? (
          <Alert
            className="sm:col-span-4"
            title="Upload failed"
            description={
              'userMessage' in upload.error
                ? upload.error.userMessage
                : 'Please choose a valid image.'
            }
            variant="error"
          />
        ) : null}
      </form>
      <DataState
        loading={query.isPending}
        error={query.error?.userMessage}
        empty={query.data?.length === 0}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {query.data?.map((item) => (
            <article
              className="overflow-hidden border border-border bg-surface"
              key={item.id}
            >
              <div className="relative aspect-[16/9] bg-surface-muted">
                <Image
                  alt={item.alt_text_en ?? item.media_key}
                  fill
                  className="object-cover"
                  src={item.url}
                  unoptimized
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-primary">
                      {item.media_key}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.media_type} · {formatDate(item.created_at)}
                    </p>
                  </div>
                  <Button
                    aria-label="Delete media"
                    onClick={() => setDeleting(item)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <label className="mt-4 grid gap-1 text-xs font-semibold text-muted-foreground">
                  Alt Text
                  <Input
                    defaultValue={item.alt_text_en ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (item.alt_text_en ?? ''))
                        update.mutate({ id: item.id, alt: e.target.value });
                    }}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </DataState>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete media asset?"
        description="The file and its database record will be removed. Confirm it is not in active use."
        confirmLabel="Delete media"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  );
}
