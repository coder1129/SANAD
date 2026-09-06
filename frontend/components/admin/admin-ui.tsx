'use client';

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
  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="type-h2 text-primary">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-border bg-surface shadow-xs">
      {children}
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
  if (loading)
    return (
      <div
        className="border border-border bg-surface p-10 text-center text-sm text-muted-foreground"
        role="status"
      >
        Loading data...
      </div>
    );
  if (error)
    return (
      <div
        className="border border-error/30 bg-error/5 p-6 text-sm text-error"
        role="alert"
      >
        {error}
      </div>
    );
  if (empty)
    return (
      <div className="border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
        No records found.
      </div>
    );
  return <>{children}</>;
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
  if (totalPages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <Button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        variant="outline"
      >
        Previous
      </Button>
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <Button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        variant="outline"
      >
        Next
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert description={error} title="Action failed" variant="error" />
        ) : null}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            loading={loading}
            loadingLabel={confirmLabel}
            onClick={onConfirm}
            variant={destructive ? 'destructive' : 'primary'}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
