'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
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
import { adminApi, adminKeys, type AdminOffer } from '@/lib/api';
import { formatDate } from '@/lib/orders/presentation';
import {
  AdminPageHeader,
  AdminTable,
  ConfirmDialog,
  DataState,
} from './admin-ui';

const schema = z
  .object({
    packageId: z.coerce.number().int().positive(),
    name: z.string().trim().min(2),
    discount: z.coerce.number().min(0).max(100),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    active: z.boolean(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    path: ['endDate'],
    message: 'End date must be after start date.',
  });
type Values = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;
const empty: Values = {
  packageId: 0,
  name: '',
  discount: 10,
  startDate: '',
  endDate: '',
  active: true,
};
function localDate(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
export function OffersManager() {
  const client = useQueryClient();
  const [editing, setEditing] = useState<AdminOffer | null | undefined>(
    undefined,
  );
  const [deleting, setDeleting] = useState<AdminOffer | null>(null);
  const params = { page: 1, limit: 100 };
  const query = useQuery({
    queryKey: adminKeys.list('offers', params),
    queryFn: ({ signal }) => adminApi.offers.list(params, { signal }),
  });
  const packages = useQuery({
    queryKey: adminKeys.list('packages', params),
    queryFn: ({ signal }) => adminApi.packages.list(params, { signal }),
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
    defaultValues: empty,
  });
  const active = useWatch({ control, name: 'active' });
  useEffect(() => {
    if (editing === null)
      reset({ ...empty, packageId: packages.data?.items[0]?.id ?? 0 });
    else if (editing)
      reset({
        packageId: editing.package_id ?? 0,
        name: editing.name_en,
        discount: Number(editing.discount_percentage),
        startDate: localDate(editing.start_date),
        endDate: localDate(editing.end_date),
        active: editing.is_active !== false,
      });
  }, [editing, packages.data, reset]);
  const invalidate = () =>
    client.invalidateQueries({ queryKey: ['admin', 'offers'] });
  const save = useMutation({
    mutationFn: (values: Values) => {
      const input = {
        package_id: values.packageId,
        name_en: values.name,
        name_ar: values.name,
        description_en: '',
        description_ar: '',
        discount_percentage: values.discount,
        start_date: new Date(values.startDate).toISOString(),
        end_date: new Date(values.endDate).toISOString(),
        is_active: values.active,
      };
      return editing
        ? adminApi.offers.update(editing.id, input)
        : adminApi.offers.create(input);
    },
    onSuccess: () => {
      void invalidate();
      setEditing(undefined);
    },
  });
  const remove = useMutation({
    mutationFn: (offer: AdminOffer) => adminApi.offers.remove(offer.id),
    onSuccess: () => {
      void invalidate();
      setDeleting(null);
    },
  });
  return (
    <>
      <AdminPageHeader
        title="Offers"
        description="Schedule package-specific percentage discounts with clear start and end dates."
        action={<Button onClick={() => setEditing(null)}>Add Offer</Button>}
      />
      <DataState
        loading={query.isPending}
        error={query.error?.userMessage}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">Offer</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((offer) => (
                <tr key={offer.id}>
                  <td className="px-4 py-4 font-semibold text-primary">
                    {offer.name_en}
                  </td>
                  <td className="px-4 py-4">{offer.package?.name_en ?? '—'}</td>
                  <td className="px-4 py-4">
                    {Number(offer.discount_percentage)}%
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDate(offer.start_date)} –{' '}
                    {formatDate(offer.end_date)}
                  </td>
                  <td className="px-4 py-4">
                    {offer.is_active ? 'Active' : 'Inactive'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Button
                        aria-label="Edit offer"
                        onClick={() => setEditing(offer)}
                        size="icon"
                        variant="outline"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        aria-label="Delete offer"
                        onClick={() => setDeleting(offer)}
                        size="icon"
                        variant="outline"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Offer' : 'Add Offer'}</DialogTitle>
            <DialogDescription>
              Required Arabic fields mirror the English label internally.
            </DialogDescription>
          </DialogHeader>
          {save.error ? (
            <Alert
              title="Could not save offer"
              description={save.error.userMessage}
              variant="error"
            />
          ) : null}
          <form
            className="grid gap-4"
            onSubmit={handleSubmit((values) => save.mutate(values))}
          >
            <label className="grid gap-1 text-sm font-semibold">
              Offer Name
              <Input {...register('name')} invalid={Boolean(errors.name)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Package
              <select
                className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
                {...register('packageId')}
              >
                <option value="0">Select package</option>
                {packages.data?.items.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name_en}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Discount %
              <Input
                max="100"
                min="0"
                step="0.01"
                type="number"
                {...register('discount')}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">
                Start Date
                <Input type="datetime-local" {...register('startDate')} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                End Date
                <Input
                  type="datetime-local"
                  {...register('endDate')}
                  invalid={Boolean(errors.endDate)}
                />
                {errors.endDate ? (
                  <span className="text-xs text-error">
                    {errors.endDate.message}
                  </span>
                ) : null}
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <Switch
                checked={active}
                onCheckedChange={(value) => setValue('active', value)}
              />
              Active
            </label>
            <DialogFooter>
              <Button onClick={() => setEditing(undefined)} variant="outline">
                Cancel
              </Button>
              <Button loading={save.isPending} type="submit">
                {save.isPending ? 'Saving...' : 'Save Offer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete offer?"
        description="Offers used by orders are safely deactivated by the backend; other offers may be removed."
        confirmLabel="Delete offer"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  );
}
