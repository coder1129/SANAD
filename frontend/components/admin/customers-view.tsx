'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { adminApi, adminKeys, type AdminCustomer } from '@/lib/api';
import { whatsappHref } from '@/lib/orders/presentation';
import {
  AdminPageHeader,
  AdminTable,
  ConfirmDialog,
  DataState,
  Pager,
} from './admin-ui';

export function CustomersView() {
  const _copy = useCopy();

  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminCustomer | null>(null);
  const [confirming, setConfirming] = useState<AdminCustomer | null>(null);
  const params = { page, limit: 20, search: search || undefined };
  const query = useQuery({
    queryKey: adminKeys.list('customers', params),
    queryFn: ({ signal }) => adminApi.customers.list(params, { signal }),
    placeholderData: keepPreviousData,
  });
  const details = useQuery({
    queryKey: adminKeys.detail('customers', selected?.id ?? 0),
    queryFn: ({ signal }) => adminApi.customers.get(selected!.id, { signal }),
    enabled: Boolean(selected),
  });
  const status = useMutation({
    mutationFn: (customer: AdminCustomer) =>
      adminApi.customers.status(
        customer.id,
        customer.account_locked !== true,
        customer.account_locked ? 'Restore access' : 'Administrator action',
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'customers'] });
      setConfirming(null);
      setSelected(null);
    },
  });
  const customer = details.data ?? selected;
  const wa = customer
    ? whatsappHref(
        customer.phone,
        `Hello ${customer.name},\n\nThis is SANAD regarding your career service orders.`,
      )
    : null;
  return (
    <>
      <AdminPageHeader
        title={_copy('Customers')}
        description={_copy(
          'Search customer profiles, purchasing history, spend, and contact details.',
        )}
      />
      <div className="mb-5 max-w-xl">
        <Input
          aria-label={_copy('Search customers')}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={_copy('Search name, email or phone')}
          value={search}
        />
      </div>
      <DataState
        loading={query.isPending}
        error={_copy(query.error?.userMessage)}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[850px] text-start text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">{_copy('Name')}</th>
                <th className="px-4 py-3">{_copy('Email')}</th>
                <th className="px-4 py-3">{_copy('Phone')}</th>
                <th className="px-4 py-3">{_copy('Gender')}</th>
                <th className="px-4 py-3">{_copy('Orders')}</th>
                <th className="px-4 py-3">{_copy('Total Spend')}</th>
                <th className="px-4 py-3">{_copy('Registered')}</th>
                <th className="px-4 py-3">{_copy('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-4 font-semibold text-primary">
                    {_copy(c.name)}
                  </td>
                  <td className="px-4 py-4">{_copy(c.email)}</td>
                  <td className="px-4 py-4">{_copy(c.phone ?? '—')}</td>
                  <td className="px-4 py-4 capitalize">
                    {_copy(c.gender ?? '—')}
                  </td>
                  <td className="px-4 py-4">{_copy(c.total_orders)}</td>
                  <td className="px-4 py-4">
                    {_copy(_copy.money(c.total_spent))}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {_copy(_copy.date(c.created_at))}
                  </td>
                  <td className="px-4 py-4">
                    <Button
                      onClick={() => setSelected(c)}
                      size="sm"
                      variant="outline"
                    >
                      {_copy('View')}
                    </Button>
                  </td>
                </tr>
              ))}
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
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{customer?.name ?? 'Customer Details'}</DialogTitle>
            <DialogDescription>
              {_copy('Customer profile and purchase summary.')}
            </DialogDescription>
          </DialogHeader>
          {details.isPending ? (
            <p className="text-sm text-muted-foreground">
              {_copy('Loading customer...')}
            </p>
          ) : customer ? (
            <>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {_copy('Email')}
                  </dt>
                  <dd className="mt-1 break-all">{customer.email}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {_copy('Phone')}
                  </dt>
                  <dd className="mt-1">{customer.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {_copy('Gender')}
                  </dt>
                  <dd className="mt-1 capitalize">
                    {_copy(customer.gender ?? '—')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {_copy('Total purchases')}
                  </dt>
                  <dd className="mt-1">
                    {_copy(_copy.money(customer.total_spent))}
                  </dd>
                </div>
              </dl>
              {customer.orders?.length ? (
                <div className="mt-5 border-t border-border pt-5">
                  <h3 className="font-semibold text-primary">
                    {_copy('Orders')}
                  </h3>
                  <div className="mt-3 max-h-56 overflow-auto divide-y divide-border">
                    {customer.orders.map((order) => (
                      <div
                        className="flex justify-between gap-4 py-3 text-sm"
                        key={order.id}
                      >
                        <span>
                          {_copy('#')}
                          {_copy(order.order_number)}
                        </span>
                        <span>{_copy(_copy.money(order.final_amount))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                {wa ? (
                  <Button asChild variant="outline">
                    <a href={wa} rel="noreferrer noopener" target="_blank">
                      <MessageCircle className="size-4" />
                      {_copy('Open WhatsApp')}
                    </a>
                  </Button>
                ) : null}
                <Button
                  onClick={() => setConfirming(customer)}
                  variant={customer.account_locked ? 'primary' : 'destructive'}
                >
                  {_copy(
                    customer.account_locked
                      ? 'Unlock Customer'
                      : 'Lock Customer',
                  )}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title={_copy(
          confirming?.account_locked
            ? 'Unlock customer account?'
            : 'Lock customer account?',
        )}
        description={_copy(
          'This changes account access and invalidates active sessions. The action is recorded.',
        )}
        confirmLabel={_copy(
          confirming?.account_locked ? 'Unlock account' : 'Lock account',
        )}
        destructive={!confirming?.account_locked}
        loading={status.isPending}
        onConfirm={() => confirming && status.mutate(confirming)}
      />
    </>
  );
}
