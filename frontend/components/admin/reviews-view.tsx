'use client';

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
import {
  formatDate,
  formatStatus,
  statusIntent,
} from '@/lib/orders/presentation';
import {
  AdminPageHeader,
  AdminTable,
  ConfirmDialog,
  DataState,
  Pager,
} from './admin-ui';
export function ReviewsView() {
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
        title="Reviews"
        description="Moderate verified-purchase feedback without changing the customer’s words."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <Input
          aria-label="Search reviews"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Customer, order or comment"
          value={search}
        />
        <select
          aria-label="Review status"
          className="min-h-11 rounded-md border border-[var(--control-border)] bg-surface px-3"
          onChange={(e) => {
            setStatus(e.target.value as ReviewStatus | '');
            setPage(1);
          }}
          value={status}
        >
          <option value="">All statuses</option>
          {['pending', 'published', 'hidden'].map((value) => (
            <option key={value} value={value}>
              {formatStatus(value)}
            </option>
          ))}
        </select>
      </div>
      <DataState
        loading={query.isPending}
        error={query.error?.userMessage}
        empty={query.data?.items.length === 0}
      >
        <AdminTable>
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Comment</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {query.data?.items.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-4">
                    <p className="font-semibold">{r.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.customerEmail}
                    </p>
                  </td>
                  <td className="px-4 py-4">{r.packageName}</td>
                  <td className="px-4 py-4">
                    <StarRating rating={r.rating} />
                  </td>
                  <td className="max-w-xs px-4 py-4">
                    <p className="line-clamp-2">{r.comment}</p>
                  </td>
                  <td className="px-4 py-4">#{r.orderNumber}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge intent={statusIntent(r.status)}>
                      {formatStatus(r.status)}
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
                        Publish
                      </Button>
                      <Button
                        disabled={r.status === 'hidden'}
                        onClick={() =>
                          setAction({ review: r, status: 'hidden' })
                        }
                        size="sm"
                        variant="outline"
                      >
                        Hide
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
        title={`${action?.status === 'published' ? 'Publish' : 'Hide'} review?`}
        description={
          action?.status === 'published'
            ? 'The review will become visible on the package and feedback pages.'
            : 'The review will no longer be visible publicly.'
        }
        confirmLabel={
          action?.status === 'published' ? 'Publish review' : 'Hide review'
        }
        destructive={action?.status === 'hidden'}
        loading={moderation.isPending}
        onConfirm={() => moderation.mutate()}
      />
    </>
  );
}
