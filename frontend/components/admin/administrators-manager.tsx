'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/lib/api';
import type { Administrator } from '@/lib/api/modules/admin';
import { useAuth } from '@/hooks/use-auth';
import { AdminPageHeader, DataState } from './admin-ui';

export function AdministratorsManager() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' as 'admin' | 'super_admin' });
  const [passwords, setPasswords] = useState<Record<number, string>>({});
  const query = useQuery({ queryKey: ['admin', 'administrators'], queryFn: () => adminApi.administrators.list(), enabled: user?.role === 'super_admin' });
  const refresh = () => client.invalidateQueries({ queryKey: ['admin', 'administrators'] });
  const create = useMutation({ mutationFn: () => adminApi.administrators.create(form), onSuccess: () => { setForm({ name: '', email: '', password: '', role: 'admin' }); void refresh(); } });
  const update = useMutation({ mutationFn: ({ id, input }: { id: number; input: { role?: 'admin' | 'super_admin'; active?: boolean } }) => adminApi.administrators.update(id, input), onSuccess: refresh });
  const reset = useMutation({ mutationFn: ({ id, password }: { id: number; password: string }) => adminApi.administrators.resetPassword(id, password), onSuccess: (_, { id }) => setPasswords((current) => ({ ...current, [id]: '' })) });

  if (user?.role !== 'super_admin') return <Alert title="Super Admin access required" description="Only Super Admins can manage administrator accounts." variant="error" />;
  return <>
    <AdminPageHeader title="Administrators" description="Create and manage secure administrator accounts." />
    <section className="mb-8 border border-border bg-surface p-6 shadow-sm">
      <h2 className="font-semibold text-primary">Add administrator</h2>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <Input type="password" minLength={12} placeholder="Temporary password (12+ characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <select className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'super_admin' })}>
          <option value="admin">Admin</option><option value="super_admin">Super Admin</option>
        </select>
        <Button className="sm:col-span-2" type="submit" loading={create.isPending}>Create administrator</Button>
      </form>
      {create.error ? <Alert className="mt-4" title="Could not create administrator" description={create.error.userMessage} variant="error" /> : null}
    </section>
    <DataState loading={query.isPending} error={query.error?.userMessage} empty={query.data?.length === 0}>
      <section className="overflow-x-auto border border-border bg-surface shadow-sm"><table className="w-full min-w-[720px] text-start text-sm"><thead className="bg-surface-muted text-secondary"><tr><th className="p-4">Name</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4">Password</th><th className="p-4">Actions</th></tr></thead><tbody className="divide-y divide-border">{query.data?.map((administrator: Administrator) => <tr key={administrator.id}><td className="p-4"><div className="font-semibold">{administrator.name}</div><div className="text-muted-foreground">{administrator.email}</div></td><td className="p-4"><select value={administrator.role} onChange={(e) => update.mutate({ id: administrator.id, input: { role: e.target.value as 'admin' | 'super_admin' } })}><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></td><td className="p-4">{administrator.account_locked ? 'Disabled' : 'Active'}</td><td className="p-4"><div className="flex gap-2"><Input type="password" minLength={12} placeholder="New password" value={passwords[administrator.id] ?? ''} onChange={(e) => setPasswords({ ...passwords, [administrator.id]: e.target.value })} /><Button type="button" variant="outline" disabled={(passwords[administrator.id] ?? '').length < 12} onClick={() => reset.mutate({ id: administrator.id, password: passwords[administrator.id] })}>Reset</Button></div></td><td className="p-4"><Button type="button" variant="outline" onClick={() => update.mutate({ id: administrator.id, input: { active: Boolean(administrator.account_locked) } })}>{administrator.account_locked ? 'Enable' : 'Disable'}</Button></td></tr>)}</tbody></table></section>
    </DataState>
  </>;
}
