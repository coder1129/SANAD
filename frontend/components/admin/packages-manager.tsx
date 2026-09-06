'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Power } from 'lucide-react';
import Image from 'next/image';
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
import { adminApi, adminKeys, ApiError, type AdminPackage } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/orders/presentation';
import {
  AdminPageHeader,
  AdminTable,
  ConfirmDialog,
  DataState,
  Pager,
} from './admin-ui';

const schema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().min(2),
  price: z.coerce.number().min(0),
  features: z.string(),
  deliveryDays: z.coerce.number().int().min(1),
  revisions: z.coerce.number().int().min(0),
  sortOrder: z.coerce.number().int(),
  active: z.boolean(),
});
type Values = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;
const defaults: Values = {
  name: '',
  description: '',
  price: 0,
  features: '',
  deliveryDays: 7,
  revisions: 1,
  sortOrder: 0,
  active: true,
};

export function PackagesManager() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminPackage | null | undefined>(
    undefined,
  );
  const [confirming, setConfirming] = useState<AdminPackage | null>(null);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);
  const [imageFeedback, setImageFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const params = { page, limit: 20 };
  const query = useQuery({
    queryKey: adminKeys.list('packages', params),
    queryFn: ({ signal }) => adminApi.packages.list(params, { signal }),
    placeholderData: keepPreviousData,
  });
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  const active = useWatch({ control, name: 'active' });
  useEffect(() => {
    if (editing === null) reset(defaults);
    else if (editing)
      reset({
        name: editing.name_en,
        description: editing.description_en ?? '',
        price: Number(editing.price),
        features: (editing.features_en ?? []).join('\n'),
        deliveryDays: editing.delivery_days,
        revisions: editing.max_revisions ?? 0,
        sortOrder: editing.sort_order ?? 0,
        active: editing.is_active !== false,
      });
  }, [editing, reset]);
  const invalidate = () =>
    client.invalidateQueries({ queryKey: ['admin', 'packages'] });
  const save = useMutation({
    mutationFn: async (values: Values) => {
      const input = {
        name_en: values.name,
        name_ar: values.name,
        description_en: values.description,
        description_ar: values.description,
        price: values.price,
        features_en: values.features
          .split('\n')
          .map((v) => v.trim())
          .filter(Boolean),
        features_ar: values.features
          .split('\n')
          .map((v) => v.trim())
          .filter(Boolean),
        delivery_days: values.deliveryDays,
        max_revisions: values.revisions,
        sort_order: values.sortOrder,
        is_active: values.active,
      };
      return editing
        ? adminApi.packages.update(editing.id, input)
        : adminApi.packages.create(input);
    },
    onSuccess: () => {
      void invalidate();
      setEditing(undefined);
    },
  });
  const status = useMutation({
    mutationFn: (pkg: AdminPackage) =>
      adminApi.packages.status(pkg.id, pkg.is_active === false),
    onSuccess: () => {
      void invalidate();
      setConfirming(null);
    },
  });
  const upload = useMutation({
    mutationFn: () => {
      if (!editing || !file) throw new Error('Select an image');
      return adminApi.packages.uploadImage(editing.id, file, {
        altText: altText || editing.name_en,
        isPrimary: editing.package_images.length === 0,
      });
    },
    onSuccess: () => {
      setFile(null);
      setAltText('');
      setImageFeedback({
        type: 'success',
        message: 'Image uploaded successfully.',
      });
      void invalidate();
      if (editing)
        void adminApi.packages
          .list({ page, limit: 20 })
          .then((result) =>
            setEditing(
              result.items.find((item) => item.id === editing.id) ?? editing,
            ),
          );
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError
          ? err.userMessage
          : (err as Error)?.message || 'Failed to upload image.';
      setImageFeedback({ type: 'error', message });
    },
  });
  const imageMutation = useMutation({
    mutationFn: ({
      imageId,
      input,
    }: {
      imageId: number;
      input: Record<string, unknown>;
    }) => adminApi.packages.updateImage(editing!.id, imageId, input),
    onSuccess: () => {
      setImageFeedback({
        type: 'success',
        message: 'Image updated successfully.',
      });
      void invalidate();
      if (editing)
        void adminApi.packages
          .list({ page, limit: 20 })
          .then((result) =>
            setEditing(
              result.items.find((item) => item.id === editing.id) ?? editing,
            ),
          );
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError
          ? err.userMessage
          : (err as Error)?.message || 'Failed to update image.';
      setImageFeedback({ type: 'error', message });
    },
  });
  const deleteImage = useMutation<unknown, ApiError, number>({
    mutationFn: (imageId: number) =>
      adminApi.packages.deleteImage(editing!.id, imageId),
    onSuccess: (_data, imageId) => {
      void invalidate();
      if (editing) {
        setEditing({
          ...editing,
          package_images: editing.package_images.filter(
            (item) => item.id !== imageId,
          ),
        });
        void adminApi.packages
          .list({ page, limit: 20 })
          .then((result) => {
            const fresh = result.items.find((item) => item.id === editing.id);
            if (fresh) setEditing(fresh);
          });
      }
      setImageFeedback({
        type: 'success',
        message: 'Image deleted successfully.',
      });
      setImageToDelete(null);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError
          ? err.userMessage
          : (err as Error)?.message || 'Failed to delete image.';
      setImageFeedback({ type: 'error', message });
    },
  });
  return (
    <>
      <AdminPageHeader
        title="Packages"
        description="Maintain service pricing, scope, delivery details, availability, and images."
        action={<Button onClick={() => setEditing(null)}>Add Package</Button>}
      />
      <DataState
        loading={query.isPending}
        error={query.error?.userMessage}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Revisions</th>
                <th className="px-4 py-3">Sort</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((pkg) => {
                const image =
                  pkg.package_images.find((item) => item.is_primary) ??
                  pkg.package_images[0];
                return (
                  <tr key={pkg.id}>
                    <td className="px-4 py-3">
                      {image ? (
                        <Image
                          alt={image.alt_text ?? pkg.name_en}
                          className="size-12 rounded-md object-cover"
                          height={48}
                          src={image.image_url ?? image.url ?? image.image_path}
                          unoptimized
                          width={48}
                        />
                      ) : (
                        <span className="grid size-12 place-items-center rounded-md bg-surface-muted text-muted-foreground">
                          <ImagePlus className="size-5" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {pkg.name_en}
                    </td>
                    <td className="px-4 py-3">{formatMoney(pkg.price)}</td>
                    <td className="px-4 py-3">
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </td>
                    <td className="px-4 py-3">{pkg.delivery_days} days</td>
                    <td className="px-4 py-3">{pkg.max_revisions ?? 0}</td>
                    <td className="px-4 py-3">{pkg.sort_order ?? 0}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(pkg.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          aria-label={`Edit ${pkg.name_en}`}
                          onClick={() => setEditing(pkg)}
                          size="icon"
                          variant="outline"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          aria-label={`${pkg.is_active ? 'Deactivate' : 'Activate'} ${pkg.name_en}`}
                          onClick={() => setConfirming(pkg)}
                          size="icon"
                          variant="outline"
                        >
                          <Power className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTable>
      </DataState>
      <Pager
        page={page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPage={setPage}
      />
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Package' : 'Add Package'}
            </DialogTitle>
            <DialogDescription>
              English content is mirrored internally to required Arabic fields
              until localized editing is introduced.
            </DialogDescription>
          </DialogHeader>
          {save.error ? (
            <Alert
              title="Could not save package"
              description={save.error.userMessage}
              variant="error"
            />
          ) : null}
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={handleSubmit((values) => save.mutate(values))}
          >
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
              Name
              <Input {...register('name')} invalid={Boolean(errors.name)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
              Description
              <Textarea
                {...register('description')}
                invalid={Boolean(errors.description)}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Price
              <Input step="0.01" type="number" {...register('price')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Delivery Days
              <Input type="number" {...register('deliveryDays')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Max Revisions
              <Input type="number" {...register('revisions')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Sort Order
              <Input type="number" {...register('sortOrder')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
              Features (one per line)
              <Textarea {...register('features')} />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2">
              <Switch
                checked={active}
                onCheckedChange={(value) => setValue('active', value)}
              />
              Active
            </label>
            <DialogFooter className="sm:col-span-2">
              <Button onClick={() => setEditing(undefined)} variant="outline">
                Cancel
              </Button>
              <Button
                loading={save.isPending}
                loadingLabel="Saving package"
                type="submit"
              >
                {save.isPending ? 'Saving...' : 'Save Package'}
              </Button>
            </DialogFooter>
          </form>
          {editing ? (
            <section className="border-t border-border pt-5">
              <h3 className="font-semibold text-primary">Package Images</h3>
              {imageFeedback ? (
                <Alert
                  className="mt-3"
                  description={imageFeedback.message}
                  title={
                    imageFeedback.type === 'success' ? 'Success' : 'Error'
                  }
                  variant={imageFeedback.type}
                />
              ) : null}
              <div className="mt-4 grid gap-3">
                {editing.package_images.map((image) => (
                  <div
                    className="grid gap-3 border border-border p-3 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center"
                    key={image.id}
                  >
                    <Image
                      alt={image.alt_text ?? editing.name_en}
                      className="size-16 object-cover"
                      height={64}
                      src={image.image_url ?? image.url ?? image.image_path}
                      unoptimized
                      width={64}
                    />
                    <Input
                      aria-label="Image alt text"
                      defaultValue={image.alt_text ?? ''}
                      onBlur={(event) => {
                        if (event.target.value !== (image.alt_text ?? ''))
                          imageMutation.mutate({
                            imageId: image.id,
                            input: { alt_text: event.target.value },
                          });
                      }}
                    />
                    <div className="flex gap-1">
                      <Button
                        aria-label="Move image up"
                        onClick={() =>
                          imageMutation.mutate({
                            imageId: image.id,
                            input: {
                              display_order: Math.max(
                                0,
                                (image.display_order ?? 0) - 1,
                              ),
                            },
                          })
                        }
                        size="icon"
                        variant="ghost"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        aria-label="Move image down"
                        onClick={() =>
                          imageMutation.mutate({
                            imageId: image.id,
                            input: {
                              display_order: (image.display_order ?? 0) + 1,
                            },
                          })
                        }
                        size="icon"
                        variant="ghost"
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        onClick={() =>
                          imageMutation.mutate({
                            imageId: image.id,
                            input: { is_primary: true },
                          })
                        }
                        size="sm"
                        variant="outline"
                      >
                        {image.is_primary ? 'Primary' : 'Set primary'}
                      </Button>
                      <Button
                        onClick={() => setImageToDelete(image.id)}
                        size="sm"
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Input
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Package image"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <Input
                  aria-label="Image alt text"
                  onChange={(event) => setAltText(event.target.value)}
                  placeholder="Image alt text"
                  value={altText}
                />
                <Button
                  disabled={!file}
                  loading={upload.isPending}
                  onClick={() => upload.mutate()}
                >
                  Upload
                </Button>
              </div>
            </section>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title={`${confirming?.is_active ? 'Deactivate' : 'Activate'} package?`}
        description="Existing order records remain preserved. Deactivated packages are removed from the public catalog."
        confirmLabel={confirming?.is_active ? 'Deactivate' : 'Activate'}
        loading={status.isPending}
        onConfirm={() => confirming && status.mutate(confirming)}
        destructive={confirming?.is_active === true}
      />
      <ConfirmDialog
        open={imageToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setImageToDelete(null);
            deleteImage.reset();
          }
        }}
        title="Delete package image?"
        description="The image file and its package reference will be removed permanently."
        confirmLabel="Delete image"
        destructive
        error={deleteImage.error?.userMessage}
        loading={deleteImage.isPending}
        onConfirm={() =>
          imageToDelete !== null && deleteImage.mutate(imageToDelete)
        }
      />
    </>
  );
}
