'use client';
import { useCopy } from '@/lib/i18n/use-copy';

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

import {
  AdminPageHeader,
  AdminTable,
  ConfirmDialog,
  DataState,
} from './admin-ui';

const schema = z
  .object({
    type: z.enum(['standard', 'cross_service_any', 'cross_service_specific']),
    packageId: z.coerce.number().int().min(0),
    triggerPackageId: z.coerce.number().int().min(0),
    name_en: z.string().trim().min(2),
    name_ar: z.string().trim().min(2),
    discount: z.coerce.number().min(0).max(100),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    active: z.boolean(),
  })
  .refine((data) => data.type !== 'standard' || data.packageId > 0, {
    path: ['packageId'],
    message: 'Select package.',
  })
  .refine((data) => data.type === 'standard' || data.triggerPackageId > 0, {
    path: ['triggerPackageId'],
    message: 'Select purchased package.',
  })
  .refine(
    (data) => data.type !== 'cross_service_specific' || data.packageId > 0,
    {
      path: ['packageId'],
      message: 'Select discounted package.',
    },
  )
  .refine(
    (data) =>
      data.type !== 'cross_service_specific' ||
      data.packageId !== data.triggerPackageId,
    {
      path: ['packageId'],
      message: 'Purchased and discounted services must be different.',
    },
  )
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    path: ['endDate'],
    message: 'End date must be after start date.',
  });
type Values = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;
const empty: Values = {
  type: 'standard',
  packageId: 0,
  triggerPackageId: 0,
  name_en: '',
  name_ar: '',
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
  const _copy = useCopy();

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
  const offerType = useWatch({ control, name: 'type' });
  useEffect(() => {
    if (editing === null)
      reset({ ...empty, packageId: packages.data?.items[0]?.id ?? 0 });
    else if (editing)
      reset({
        packageId: editing.package_id ?? 0,
        triggerPackageId: editing.trigger_package_id ?? 0,
        type: editing.offer_type ?? 'standard',
        name_en: editing.name_en,
        name_ar: editing.name_ar ?? '',
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
        ...(values.type === 'cross_service_any'
          ? {}
          : { package_id: values.packageId }),
        offer_type: values.type,
        ...(values.type !== 'standard'
          ? { trigger_package_id: values.triggerPackageId }
          : {}),
        name_en: values.name_en,
        name_ar: values.name_ar,
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
        title={_copy('Offers')}
        description={_copy(
          'Schedule package-specific percentage discounts with clear start and end dates.',
        )}
        action={
          <Button onClick={() => setEditing(null)}>{_copy('Add Offer')}</Button>
        }
      />
      <DataState
        loading={query.isPending}
        error={_copy(query.error?.userMessage)}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[760px] text-start text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">{_copy('Offer')}</th>
                <th className="px-4 py-3">{_copy('Purchased service')}</th>
                <th className="px-4 py-3">{_copy('Discounted service')}</th>
                <th className="px-4 py-3">{_copy('Discount')}</th>
                <th className="px-4 py-3">{_copy('Dates')}</th>
                <th className="px-4 py-3">{_copy('Status')}</th>
                <th className="px-4 py-3">{_copy('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((offer) => (
                <tr key={offer.id}>
                  <td className="px-4 py-4 font-semibold text-primary">
                    <div>{_copy(offer.name_en)}</div>
                    {offer.name_ar ? (
                      <div className="text-xs font-normal text-muted-foreground">
                        {offer.name_ar}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    {_copy(
                      offer.trigger_package?.name_en ?? '—',
                      offer.trigger_package?.name_ar,
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {_copy(
                      offer.offer_type === 'cross_service_any'
                        ? 'Any second service'
                        : (offer.package?.name_en ?? '—'),
                      offer.package?.name_ar,
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {_copy(Number(offer.discount_percentage))}
                    {_copy('%')}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {_copy(_copy.date(offer.start_date))} {_copy('–')}
                    {_copy(' ')}
                    {_copy(_copy.date(offer.end_date))}
                  </td>
                  <td className="px-4 py-4">
                    {_copy(offer.is_active ? 'Active' : 'Inactive')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Button
                        aria-label={_copy('Edit offer')}
                        onClick={() => setEditing(offer)}
                        size="icon"
                        variant="outline"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        aria-label={_copy('Delete offer')}
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
            <DialogTitle>
              {_copy(editing ? 'Edit Offer' : 'Add Offer')}
            </DialogTitle>
            <DialogDescription>
              {_copy(
                'Manage offer details, discount percentage, and localized English and Arabic content.',
              )}
            </DialogDescription>
          </DialogHeader>
          {save.error ? (
            <Alert
              title={_copy('Could not save offer')}
              description={_copy(save.error.userMessage)}
              variant="error"
            />
          ) : null}
          <form
            className="grid gap-4"
            onSubmit={handleSubmit((values) => save.mutate(values))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">
                {_copy('English Name')}
                <Input
                  {...register('name_en')}
                  invalid={Boolean(errors.name_en)}
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                {_copy('Arabic Name')}
                <Input
                  dir="rtl"
                  {...register('name_ar')}
                  invalid={Boolean(errors.name_ar)}
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('Offer type')}
              <select
                className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
                {...register('type')}
              >
                <option value="standard">
                  {_copy('Discount on one service')}
                </option>
                <option value="cross_service_any">
                  {_copy('Buy a service, discount any second service')}
                </option>
                <option value="cross_service_specific">
                  {_copy('Buy a service, discount a selected second service')}
                </option>
              </select>
            </label>
            {offerType !== 'standard' ? (
              <label className="grid gap-1 text-sm font-semibold">
                {_copy('Purchased service')}
                <select
                  className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
                  aria-invalid={errors.triggerPackageId ? true : undefined}
                  {...register('triggerPackageId')}
                >
                  <option value="0">{_copy('Select package')}</option>
                  {packages.data?.items.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {_copy(pkg.name_en, pkg.name_ar)}
                    </option>
                  ))}
                </select>
                {errors.triggerPackageId ? (
                  <span className="text-xs font-normal text-error">
                    {_copy(errors.triggerPackageId.message)}
                  </span>
                ) : null}
              </label>
            ) : null}
            {offerType !== 'cross_service_any' ? (
              <label className="grid gap-1 text-sm font-semibold">
                {_copy(
                  offerType === 'standard' ? 'Service' : 'Discounted service',
                )}
                <select
                  className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
                  aria-invalid={errors.packageId ? true : undefined}
                  {...register('packageId')}
                >
                  <option value="0">{_copy('Select package')}</option>
                  {packages.data?.items.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {_copy(pkg.name_en, pkg.name_ar)}
                    </option>
                  ))}
                </select>
                {errors.packageId ? (
                  <span className="text-xs font-normal text-error">
                    {_copy(errors.packageId.message)}
                  </span>
                ) : null}
              </label>
            ) : null}
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('Discount %')}
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
                {_copy('Start Date')}
                <Input type="datetime-local" {...register('startDate')} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                {_copy('End Date')}
                <Input
                  type="datetime-local"
                  {...register('endDate')}
                  invalid={Boolean(errors.endDate)}
                />
                {errors.endDate ? (
                  <span className="text-xs text-error">
                    {_copy(errors.endDate.message)}
                  </span>
                ) : null}
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <Switch
                checked={active}
                onCheckedChange={(value) => setValue('active', value)}
              />
              {_copy('Active')}
            </label>
            <DialogFooter>
              <Button onClick={() => setEditing(undefined)} variant="outline">
                {_copy('Cancel')}
              </Button>
              <Button loading={save.isPending} type="submit">
                {_copy(save.isPending ? 'Saving...' : 'Save Offer')}
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
        title={_copy('Delete offer?')}
        description={_copy(
          'Offers used by orders are safely deactivated by the backend; other offers may be removed.',
        )}
        confirmLabel="Delete offer"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  );
}
