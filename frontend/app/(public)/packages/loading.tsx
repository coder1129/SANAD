import { Skeleton } from '@/components/ui/skeleton';

export default function PackagesLoading() {
  return (
    <div
      className="layout-container layout-section"
      role="status"
      aria-label="Loading service information"
    >
      <p className="mb-6 text-sm text-muted-foreground">
        Loading service information…
      </p>
      <Skeleton className="h-10 w-3/4 max-w-xl" />
      <Skeleton className="mt-4 h-6 w-full max-w-2xl" />
      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-lg border border-border p-5">
            <Skeleton className="aspect-[16/10] w-full" />
            <Skeleton className="mt-5 h-7 w-3/4" />
            <Skeleton className="mt-4 h-16 w-full" />
            <Skeleton className="mt-6 h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
