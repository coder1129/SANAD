'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { adminApi, adminKeys } from '@/lib/api';

import { AdminPageHeader, AdminTable, DataState, Pager } from './admin-ui';
export function ActivityLogsView() {
  const _copy = useCopy();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const params = { page, limit: 25, search: search || undefined };
  const query = useQuery({
    queryKey: adminKeys.list('activity-logs', params),
    queryFn: ({ signal }) => adminApi.activityLogs(params, { signal }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <AdminPageHeader
        title={_copy('Activity Logs')}
        description={_copy(
          'Read-only audit history for administrative changes across SANAD.',
        )}
      />
      <div className="mb-5 max-w-xl">
        <Input
          aria-label={_copy('Search activity logs')}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={_copy('Search admin or description')}
          value={search}
        />
      </div>
      <DataState
        loading={query.isPending}
        error={_copy(query.error?.userMessage)}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[860px] text-start text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">{_copy('Admin')}</th>
                <th className="px-4 py-3">{_copy('Action')}</th>
                <th className="px-4 py-3">{_copy('Entity')}</th>
                <th className="px-4 py-3">{_copy('Record')}</th>
                <th className="px-4 py-3">{_copy('Summary')}</th>
                <th className="px-4 py-3">{_copy('Date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold">{_copy(log.admin.name)}</p>
                    <p className="text-xs text-muted-foreground">
                      {_copy(log.admin.email)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {_copy(_copy.status(log.action))}
                  </td>
                  <td className="px-4 py-4">
                    {_copy(log.table_name ? _copy.status(log.table_name) : '—')}
                  </td>
                  <td className="px-4 py-4">{_copy(log.record_id ?? '—')}</td>
                  <td className="max-w-md px-4 py-4">
                    <p>{_copy(log.description ?? 'Administrative action')}</p>
                    {log.changes ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-secondary">
                          {_copy('Raw metadata')}
                        </summary>
                        <pre className="mt-2 max-w-sm overflow-auto bg-surface-muted p-3 text-xs">
                          {_copy(JSON.stringify(log.changes, null, 2))}
                        </pre>
                      </details>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {_copy(_copy.date(log.created_at))}
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
    </>
  );
}
