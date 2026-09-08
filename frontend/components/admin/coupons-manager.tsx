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
import { adminApi, adminKeys, type AdminCoupon } from '@/lib/api';

import {
  AdminPageHeader,
  AdminTable,
  ConfirmDialog,
  DataState,
} from './admin-ui';

const schema = z
  .object({
    code: z.string().trim().min(2),
    type: z.enum(['percentage', 'fixed']),
    value: z.coerce.number().positive(),
    minimum: z.coerce.number().min(0),
    maxDiscount: z.string(),
    usageLimit: z.string(),
    perUser: z.coerce.number().int().min(1),
    startDate: z.string(),
    endDate: z.string(),
    active: z.boolean(),
  })
  .refine((data) => data.type !== 'percentage' || data.value <= 100, {
    path: ['value'],
    message: 'Percentage cannot exceed 100.',
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      new Date(data.endDate) > new Date(data.startDate),
    { path: ['endDate'], message: 'End date must be after start date.' },
  );
type Values = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;
const empty: Values = {
  code: '',
  type: 'percentage',
  value: 10,
  minimum: 0,
  maxDiscount: '',
  usageLimit: '',
  perUser: 1,
  startDate: '',
  endDate: '',
  active: true,
};
function day(value: string | null) {
  return value ? value.slice(0, 10) : '';
}
export function CouponsManager() {
  const _copy = useCopy();

  const client = useQueryClient();
  const [editing, setEditing] = useState<AdminCoupon | null | undefined>(
    undefined,
  );
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null);
  const params = { page: 1, limit: 100 };
  const query = useQuery({
    queryKey: adminKeys.list('coupons', params),
    queryFn: ({ signal }) => adminApi.coupons.list(params, { signal }),
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
    if (editing === null) reset(empty);
    else if (editing)
      reset({
        code: editing.code,
        type: editing.discount_type,
        value: Number(editing.discount_value),
        minimum: Number(editing.min_order_amount ?? 0),
        maxDiscount:
          editing.max_discount_amount === null
            ? ''
            : String(editing.max_discount_amount),
        usageLimit:
          editing.usage_limit === null ? '' : String(editing.usage_limit),
        perUser: editing.usage_per_user ?? 1,
        startDate: day(editing.start_date),
        endDate: day(editing.end_date),
        active: editing.is_active !== false,
      });
  }, [editing, reset]);
  const invalidate = () =>
    client.invalidateQueries({ queryKey: ['admin', 'coupons'] });
  const save = useMutation({
    mutationFn: (values: Values) => {
      const input = {
        code: values.code,
        discount_type: values.type,
        discount_value: values.value,
        min_order_amount: values.minimum,
        ...(values.maxDiscount
          ? { max_discount_amount: Number(values.maxDiscount) }
          : {}),
        ...(values.usageLimit
          ? { usage_limit: Number(values.usageLimit) }
          : {}),
        usage_per_user: values.perUser,
        ...(values.startDate
          ? {
              start_date: new Date(
                `${values.startDate}T00:00:00`,
              ).toISOString(),
            }
          : {}),
        ...(values.endDate
          ? { end_date: new Date(`${values.endDate}T23:59:59`).toISOString() }
          : {}),
        is_active: values.active,
      };
      return editing
        ? adminApi.coupons.update(editing.id, input)
        : adminApi.coupons.create(input);
    },
    onSuccess: () => {
      void invalidate();
      setEditing(undefined);
    },
  });
  const remove = useMutation({
    mutationFn: (coupon: AdminCoupon) => adminApi.coupons.remove(coupon.id),
    onSuccess: () => {
      void invalidate();
      setDeleting(null);
    },
  });
  return (
    <>
      <AdminPageHeader
        title={_copy('Coupons')}
        description={_copy(
          'Control discount codes, limits, minimum amounts, and availability.',
        )}
        action={
          <Button onClick={() => setEditing(null)}>
            {_copy('Add Coupon')}
          </Button>
        }
      />
      <DataState
        loading={query.isPending}
        error={_copy(query.error?.userMessage)}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[900px] text-start text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">{_copy('Code')}</th>
                <th className="px-4 py-3">{_copy('Type')}</th>
                <th className="px-4 py-3">{_copy('Value')}</th>
                <th className="px-4 py-3">{_copy('Minimum')}</th>
                <th className="px-4 py-3">{_copy('Usage')}</th>
                <th className="px-4 py-3">{_copy('Expiration')}</th>
                <th className="px-4 py-3">{_copy('Status')}</th>
                <th className="px-4 py-3">{_copy('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-4 font-mono font-semibold text-primary">
                    {_copy(c.code)}
                  </td>
                  <td className="px-4 py-4 capitalize">
                    {_copy(c.discount_type)}
                  </td>
                  <td className="px-4 py-4">
                    {_copy(
                      c.discount_type === 'percentage'
                        ? `${Number(c.discount_value)}%`
                        : _copy.money(c.discount_value),
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {_copy(_copy.money(c.min_order_amount ?? 0))}
                  </td>
                  <td className="px-4 py-4">
                    {_copy(c.times_used ?? 0)}
                    {_copy(c.usage_limit ? ` / ${c.usage_limit}` : '')}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {_copy(c.end_date ? _copy.date(c.end_date) : 'No expiry')}
                  </td>
                  <td className="px-4 py-4">
                    {_copy(c.is_active ? 'Active' : 'Inactive')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Button
                        aria-label={_copy('Edit coupon')}
                        onClick={() => setEditing(c)}
                        size="icon"
                        variant="outline"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        aria-label={_copy('Delete coupon')}
                        onClick={() => setDeleting(c)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {_copy(editing ? 'Edit Coupon' : 'Add Coupon')}
            </DialogTitle>
            <DialogDescription>
              {_copy(
                'Coupon rules are validated again by the server during checkout.',
              )}
            </DialogDescription>
          </DialogHeader>
          {save.error ? (
            <Alert
              title={_copy('Could not save coupon')}
              description={_copy(save.error.userMessage)}
              variant="error"
            />
          ) : null}
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={handleSubmit((v) => save.mutate(v))}
          >
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('Code')}
              <Input {...register('code')} invalid={Boolean(errors.code)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('Type')}
              <select
                className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
                {...register('type')}
              >
                <option value="percentage">{_copy('Percentage')}</option>
                <option value="fixed">{_copy('Fixed amount')}</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('Value')}
              <Input
                type="number"
                step="0.01"
                {...register('value')}
                invalid={Boolean(errors.value)}
              />
              {errors.value ? (
                <span className="text-xs text-error">
                  {_copy(errors.value.message)}
                </span>
              ) : null}
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('Minimum Amount')}
              <Input type="number" step="0.01" {...register('minimum')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('Max Discount (optional)')}
              <Input type="number" step="0.01" {...register('maxDiscount')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('Usage Limit (optional)')}
              <Input type="number" {...register('usageLimit')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('Uses Per Customer')}
              <Input type="number" {...register('perUser')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('Start Date')}
              <Input type="date" {...register('startDate')} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {_copy('End Date')}
              <Input
                type="date"
                {...register('endDate')}
                invalid={Boolean(errors.endDate)}
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2">
              <Switch
                checked={active}
                onCheckedChange={(v) => setValue('active', v)}
              />
              {_copy('Active')}
            </label>
            <DialogFooter className="sm:col-span-2">
              <Button onClick={() => setEditing(undefined)} variant="outline">
                {_copy('Cancel')}
              </Button>
              <Button loading={save.isPending} type="submit">
                {_copy(save.isPending ? 'Saving...' : 'Save Coupon')}
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
        title={_copy('Delete coupon?')}
        description={_copy(
          'Used coupons are safely deactivated by the backend so purchase history remains intact.',
        )}
        confirmLabel="Delete coupon"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  );
}
