'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/lib/api';
import { isApiError } from '@/lib/api/errors';
import { useCopy } from '@/lib/i18n/use-copy';
import type { Administrator } from '@/lib/api/modules/admin';
import { useAuth } from '@/hooks/use-auth';
import { AdminPageHeader, ConfirmDialog, DataState } from './admin-ui';

export function AdministratorsManager() {
  const _copy = useCopy();
  const { user } = useAuth();
  const client = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin' as 'admin' | 'super_admin',
  });
  const [passwords, setPasswords] = useState<Record<number, string>>({});
  const [names, setNames] = useState<Record<number, string>>({});
  const [savedNameId, setSavedNameId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Administrator | null>(null);
  const query = useQuery({
    queryKey: ['admin', 'administrators'],
    queryFn: () => adminApi.administrators.list(),
    enabled: user?.role === 'super_admin',
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ['admin', 'administrators'] });
  const create = useMutation({
    mutationFn: () => adminApi.administrators.create(form),
    onSuccess: () => {
      setForm({ name: '', email: '', password: '', role: 'admin' });
      void refresh();
    },
  });
  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: {
        name?: string;
        role?: 'admin' | 'super_admin';
        active?: boolean;
      };
    }) => adminApi.administrators.update(id, input),
    onSuccess: (administrator, variables) => {
      client.setQueryData<Administrator[]>(
        ['admin', 'administrators'],
        (current) =>
          current?.map((item) =>
            item.id === administrator.id ? { ...item, ...administrator } : item,
          ),
      );
      if (variables.input.name !== undefined) {
        setNames(({ [variables.id]: _savedName, ...current }) => current);
        setSavedNameId(variables.id);
      }
      void refresh();
    },
  });
  const reset = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      adminApi.administrators.resetPassword(id, password),
    onSuccess: (_, { id }) =>
      setPasswords((current) => ({ ...current, [id]: '' })),
  });
  const remove = useMutation({
    mutationFn: (administrator: Administrator) =>
      adminApi.administrators.remove(administrator.id),
    onSuccess: () => {
      setDeleting(null);
      void refresh();
    },
  });

  if (user?.role !== 'super_admin')
    return (
      <Alert
        title="Super Admin access required"
        description="Only Super Admins can manage administrator accounts."
        variant="error"
      />
    );
  return (
    <>
      <AdminPageHeader
        title="Administrators"
        description="Create and manage secure administrator accounts."
      />
      <section className="mb-8 border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-semibold text-primary">
          {_copy('Add administrator')}
        </h2>
        <form
          autoComplete="off"
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <Input
            autoComplete="off"
            name="new-administrator-name"
            placeholder={_copy('Full name')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            autoComplete="off"
            name="new-administrator-email"
            type="email"
            placeholder={_copy('Email address')}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            autoComplete="new-password"
            name="new-administrator-password"
            type="password"
            minLength={12}
            placeholder={_copy('Temporary password (12+ characters)')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
            value={form.role}
            onChange={(e) =>
              setForm({
                ...form,
                role: e.target.value as 'admin' | 'super_admin',
              })
            }
          >
            <option value="admin">{_copy('Admin')}</option>
            <option value="super_admin">{_copy('Super Admin')}</option>
          </select>
          <Button
            className="sm:col-span-2"
            type="submit"
            loading={create.isPending}
          >
            {_copy('Create administrator')}
          </Button>
        </form>
        {create.error ? (
          <Alert
            className="mt-4"
            title={_copy('Could not create administrator')}
            description={
              isApiError(create.error) && create.error.status === 409
                ? _copy(
                    'This email already has an account. Update its name below instead of creating it again.',
                  )
                : _copy(create.error.userMessage)
            }
            variant="error"
          />
        ) : null}
      </section>
      <DataState
        loading={query.isPending}
        error={query.error?.userMessage}
        empty={query.data?.length === 0}
      >
        <section className="overflow-x-auto border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[720px] text-start text-sm">
            <thead className="bg-surface-muted text-secondary">
              <tr>
                <th className="p-4">{_copy('Name')}</th>
                <th className="p-4">{_copy('Role')}</th>
                <th className="p-4">{_copy('Status')}</th>
                <th className="p-4">{_copy('Password')}</th>
                <th className="p-4">{_copy('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.map((administrator: Administrator) => (
                <tr key={administrator.id}>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Input
                        aria-label={`Name for ${administrator.email}`}
                        value={names[administrator.id] ?? administrator.name}
                        onChange={(event) => {
                          setSavedNameId(null);
                          setNames({
                            ...names,
                            [administrator.id]: event.target.value,
                          });
                        }}
                      />
                      <Button
                        disabled={
                          (names[administrator.id] ?? administrator.name).trim()
                            .length < 2 ||
                          (
                            names[administrator.id] ?? administrator.name
                          ).trim() === administrator.name
                        }
                        loading={update.isPending}
                        onClick={() => {
                          const name = (
                            names[administrator.id] ?? administrator.name
                          ).trim();
                          update.mutate({
                            id: administrator.id,
                            input: { name },
                          });
                        }}
                        type="button"
                        variant="outline"
                      >
                        {_copy('Save')}
                      </Button>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {administrator.email}
                    </div>
                    {savedNameId === administrator.id ? (
                      <p className="mt-1 text-xs text-success">
                        {_copy('Name saved')}
                      </p>
                    ) : null}
                  </td>
                  <td className="p-4">
                    {administrator.id === user?.id ? (
                      <span className="font-semibold text-primary">
                        {_copy('Super Admin')}
                      </span>
                    ) : (
                      <select
                        value={administrator.role}
                        onChange={(e) =>
                          update.mutate({
                            id: administrator.id,
                            input: {
                              role: e.target.value as 'admin' | 'super_admin',
                            },
                          })
                        }
                      >
                        <option value="admin">{_copy('Admin')}</option>
                        <option value="super_admin">
                          {_copy('Super Admin')}
                        </option>
                      </select>
                    )}
                  </td>
                  <td className="p-4">
                    {_copy(
                      administrator.account_locked ? 'Disabled' : 'Active',
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        minLength={12}
                        placeholder={_copy('New password')}
                        value={passwords[administrator.id] ?? ''}
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            [administrator.id]: e.target.value,
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          (passwords[administrator.id] ?? '').length < 12
                        }
                        onClick={() =>
                          reset.mutate({
                            id: administrator.id,
                            password: passwords[administrator.id],
                          })
                        }
                      >
                        {_copy('Reset')}
                      </Button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          update.mutate({
                            id: administrator.id,
                            input: {
                              active: Boolean(administrator.account_locked),
                            },
                          })
                        }
                      >
                        {_copy(
                          administrator.account_locked ? 'Enable' : 'Disable',
                        )}
                      </Button>
                      <Button
                        disabled={administrator.id === user?.id}
                        onClick={() => setDeleting(administrator)}
                        type="button"
                        variant="destructive"
                      >
                        {_copy('Delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {update.error ? (
          <Alert
            className="m-4"
            description={_copy(update.error.userMessage)}
            title={_copy('Could not save administrator')}
            variant="error"
          />
        ) : null}
      </DataState>
      <ConfirmDialog
        confirmLabel="Delete administrator"
        description="This permanently removes the administrator account. This cannot be undone."
        destructive
        error={remove.error?.userMessage}
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        open={Boolean(deleting)}
        title="Delete administrator?"
      />
    </>
  );
}
