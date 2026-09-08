'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import type { ReactNode } from 'react';
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

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const _copy = useCopy();

  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="type-h2 text-primary">{_copy(title)}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {_copy(description)}
        </p>
      </div>
      {_copy(action)}
    </div>
  );
}

export function AdminTable({ children }: { children: ReactNode }) {
  const _copy = useCopy();

  return (
    <div className="overflow-x-auto border border-border bg-surface shadow-xs">
      {_copy(children)}
    </div>
  );
}

export function DataState({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error?: string | null;
  empty?: boolean;
  children: ReactNode;
}) {
  const _copy = useCopy();

  if (loading)
    return (
      <div
        className="border border-border bg-surface p-10 text-center text-sm text-muted-foreground"
        role="status"
      >
        {_copy('Loading data...')}
      </div>
    );
  if (error)
    return (
      <div
        className="border border-error/30 bg-error/5 p-6 text-sm text-error"
        role="alert"
      >
        {_copy(error)}
      </div>
    );
  if (empty)
    return (
      <div className="border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
        {_copy('No records found.')}
      </div>
    );
  return <>{_copy(children)}</>;
}

export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  const _copy = useCopy();

  if (totalPages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <Button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        variant="outline"
      >
        {_copy('Previous')}
      </Button>
      <p className="text-sm text-muted-foreground">
        {_copy('Page')}
        {_copy(page)} {_copy('of')}
        {_copy(totalPages)}
      </p>
      <Button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        variant="outline"
      >
        {_copy('Next')}
      </Button>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
  destructive = false,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  destructive?: boolean;
  error?: string | null;
}) {
  const _copy = useCopy();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{_copy(title)}</DialogTitle>
          <DialogDescription>{_copy(description)}</DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert
            description={_copy(error)}
            title={_copy('Action failed')}
            variant="error"
          />
        ) : null}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            {_copy('Cancel')}
          </Button>
          <Button
            loading={loading}
            loadingLabel={_copy(confirmLabel)}
            onClick={onConfirm}
            variant={destructive ? 'destructive' : 'primary'}
          >
            {_copy(confirmLabel)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
