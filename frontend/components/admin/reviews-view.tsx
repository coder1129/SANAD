'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useState } from 'react';
import { StarRating } from '@/components/feedback/star-rating';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { reviewKeys, reviewsApi } from '@/lib/api';
import type { PackageReview, ReviewStatus } from '@/types/domain';
import { statusIntent } from '@/lib/orders/presentation';
import {
  AdminPageHeader,
  AdminTable,
  ConfirmDialog,
  DataState,
  Pager,
} from './admin-ui';
export function ReviewsView() {
  const _copy = useCopy();

  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ReviewStatus | ''>('');
  const [action, setAction] = useState<{
    review: PackageReview;
    status: 'published' | 'hidden';
  } | null>(null);
  const params = {
    page,
    limit: 20,
    search: search || undefined,
    status: status || undefined,
  };
  const query = useQuery({
    queryKey: reviewKeys.admin(params),
    queryFn: ({ signal }) => reviewsApi.listAdmin(params, { signal }),
    placeholderData: keepPreviousData,
  });
  const moderation = useMutation({
    mutationFn: () => reviewsApi.moderate(action!.review.id, action!.status),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      void client.invalidateQueries({ queryKey: ['reviews', 'public'] });
      void client.invalidateQueries({ queryKey: ['packages'] });
      setAction(null);
    },
  });
  return (
    <>
      <AdminPageHeader
        title={_copy('Reviews')}
        description={_copy(
          'Moderate verified-purchase feedback without changing the customer’s words.',
        )}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <Input
          aria-label={_copy('Search reviews')}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={_copy('Customer, order or comment')}
          value={search}
        />
        <select
          aria-label={_copy('Review status')}
          className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
          onChange={(e) => {
            setStatus(e.target.value as ReviewStatus | '');
            setPage(1);
          }}
          value={status}
        >
          <option value="">{_copy('All statuses')}</option>
          {['pending', 'published', 'hidden'].map((value) => (
            <option key={value} value={value}>
              {_copy(_copy.status(value))}
            </option>
          ))}
        </select>
      </div>
      <DataState
        loading={query.isPending}
        error={_copy(query.error?.userMessage)}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[980px] text-start text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">{_copy('Customer')}</th>
                <th className="px-4 py-3">{_copy('Package')}</th>
                <th className="px-4 py-3">{_copy('Rating')}</th>
                <th className="px-4 py-3">{_copy('Comment')}</th>
                <th className="px-4 py-3">{_copy('Order')}</th>
                <th className="px-4 py-3">{_copy('Date')}</th>
                <th className="px-4 py-3">{_copy('Status')}</th>
                <th className="px-4 py-3">{_copy('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold">{_copy(r.customerName)}</p>
                    <p className="text-xs text-muted-foreground">
                      {_copy(r.customerEmail)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {_copy(r.packageName, r.packageNameAr)}
                  </td>
                  <td className="px-4 py-4">
                    <StarRating rating={r.rating} />
                  </td>
                  <td className="max-w-xs px-4 py-4">
                    <p className="line-clamp-2">{_copy(r.comment)}</p>
                  </td>
                  <td className="px-4 py-4">
                    {_copy('#')}
                    {_copy(r.orderNumber)}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {_copy(_copy.date(r.createdAt))}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge intent={statusIntent(r.status)}>
                      {_copy(_copy.status(r.status))}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Button
                        disabled={r.status === 'published'}
                        onClick={() =>
                          setAction({ review: r, status: 'published' })
                        }
                        size="sm"
                      >
                        {_copy('Publish')}
                      </Button>
                      <Button
                        disabled={r.status === 'hidden'}
                        onClick={() =>
                          setAction({ review: r, status: 'hidden' })
                        }
                        size="sm"
                        variant="outline"
                      >
                        {_copy('Hide')}
                      </Button>
                    </div>
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
      <ConfirmDialog
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title={_copy(
          action?.status === 'published' ? 'Publish review?' : 'Hide review?',
        )}
        description={_copy(
          action?.status === 'published'
            ? 'The review will become visible on the package and feedback pages.'
            : 'The review will no longer be visible publicly.',
        )}
        confirmLabel={_copy(
          action?.status === 'published' ? 'Publish review' : 'Hide review',
        )}
        destructive={action?.status === 'hidden'}
        loading={moderation.isPending}
        onConfirm={() => moderation.mutate()}
      />
    </>
  );
}
