# TanStack Query Foundation

TanStack Query infrastructure for SANAD — stable client/defaults, retry strategy, query-key architecture, and conventions for pagination, mutations, and cache invalidation.

Phase 6 is **infrastructure only**. No business queries are implemented. Domain query keys and hooks are built in later feature phases.

## Architecture

```
Page / Feature (Server or Client Component)
  ↓
Future Domain Query Hook (usePackages / useOrders / etc.)
  ↓
Future Domain API Module (lib/api/modules/packages.ts)
  ↓
Phase 5 API Core (lib/api/)
  ↓
Backend
```

TanStack Query manages the browser cache. The Phase 5 API layer remains the single HTTP transport.

## QueryClient Lifecycle

Server renders: fresh `QueryClient` per request, isolated from other requests.

Browser: one module-level `QueryClient` reused across renders and navigations, preserving the cache.

Implementation: `getQueryClient()` in [query-client.ts](./query-client.ts).

Pattern matches Next.js 16.3.3 + TanStack Query 5.102.8 official guide: `node_modules/next/dist/docs/01-app/02-guides/client-side-data-fetching/tanstack-query.md`.

## Query Defaults

**Freshness (`staleTime`):** 60 seconds baseline. Long enough to avoid redundant requests on remount/navigation; short enough that nothing feels frozen. Domain queries override where needed (public packages may cache longer; order status tighter).

**Garbage collection (`gcTime`):** 5 minutes. Unobserved queries survive realistic tab-switch / detail-back trips without memory leaks from long admin sessions.

**Retry:** Network/server errors get bounded retries (2 attempts for network, 2 for 5xx, 1 for timeout). Client/business errors (4xx) never retry — the same request produces the same response. Canceled requests never retry. See [retry.ts](./retry.ts).

**Retry delay:** Exponential backoff (0.5s → 1s → 2s → …) capped at 15s. Honours backend `Retry-After` header when present (503 responses), bounded to same cap.

**Refetch behavior:**

- `refetchOnWindowFocus: false` — SANAD data rarely changes while the user is away; features needing live updates (order status, notifications) opt in per query.
- `refetchOnReconnect: true` — reconnecting after offline is exactly when cached data is likely stale.
- `refetchOnMount: true` — respects `staleTime`; fresh data skips the request.

**Network mode:** `'online'` — requests pause while offline and resume on reconnect. No offline queueing or optimistic-offline complexity.

## Query Keys

Standardized hierarchical keys via `createResourceQueryKeys(scope)` in [query-keys.ts](./query-keys.ts):

```ts
const orderKeys = createResourceQueryKeys('orders');

orderKeys.all; // ['orders']
orderKeys.lists(); // ['orders', 'list']
orderKeys.list({ page: 2 }); // ['orders', 'list', { page: 2 }]
orderKeys.details(); // ['orders', 'detail']
orderKeys.detail(id); // ['orders', 'detail', id]
orderKeys.relation(id, 'files'); // ['orders', 'detail', id, 'files']
```

Filters are normalized before entering the key: `undefined`/`null` dropped, empty arrays dropped, keys sorted. Same request → same cache entry.

**Nested namespaces:** `createResourceQueryKeys('admin', 'orders')` sits under `['admin']`, cleared with all other admin cache.

**Domain keys:** created alongside the API module they serve, not centrally. Phase 6 includes the pattern/factory only.

## Cache Invalidation

**Principle:** invalidate only related keys. Individual mutations decide their scope; the QueryClient does not globally invalidate on every write.

**Examples (future phases):**

Updating an order:

```ts
await queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
await queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
```

Updating a package:

```ts
await queryClient.invalidateQueries({ queryKey: packageKeys.detail(id) });
await queryClient.invalidateQueries({ queryKey: packageKeys.lists() });
```

Creating/deleting a resource:

```ts
await queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
// detail keys untouched
```

Admin dashboard totals depending on orders:

```ts
await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
```

**Broadcast invalidation:** `orderKeys.all` matches every order-related key. Use sparingly.

## Mutations

**Defaults:** `retry: false` — writes are not assumed idempotent. A retried checkout/payment/upload can duplicate work. Mutations that are safe to repeat opt in per call.

**Optimistic updates:** supported but not mandated. Use where the final value is known (toggle read/unread, increment count). Always restore previous value in `onError`.

**Error handling:** mutations do not globally toast or redirect. Each feature decides its UI response. `error` is `ApiError` everywhere via the `Register` augmentation.

**Pattern (future):**

```ts
const mutation = useMutation({
  mutationFn: (data) => api.post('/endpoint', data),
  onSuccess: (result, variables) => {
    queryClient.invalidateQueries({ queryKey: relevantKeys });
  },
  onError: (error) => {
    // feature decides: toast, inline message, modal, etc.
  },
});
```

## Pagination

Phase 5 provides `PaginatedData<T>` and `PaginationParams`. Phase 6 ensures TanStack Query can consume them.

Future paginated queries should use `placeholderData: keepPreviousData` (TanStack Query 5.x) or equivalent to preserve the previous page while the next loads, avoiding flash-to-skeleton on page change.

**Pattern (future):**

```ts
const { data, isFetching } = useQuery({
  queryKey: orderKeys.list({ page, limit }),
  queryFn: ({ signal }) => ordersApi.list({ page, limit, signal }),
  placeholderData: keepPreviousData,
});

// data.items and data.meta available immediately
// isFetching true while next page loads in background
```

Server-side pagination (page/limit in URL) and client-side pagination (all in one key, paginate in UI) both supported.

## AbortSignal Integration

Phase 5 API core accepts `signal` in `ApiRequestOptions`. Future query functions pass it through:

```ts
queryFn: ({ signal }) => api.get('/endpoint', { signal });
```

TanStack Query cancels the request when the query unmounts or the key changes. Canceled requests do not retry and do not produce user-facing errors.

## Error Contract

Every error reaching the cache is `ApiError` from Phase 5. TanStack Query's `Register` augmentation in [register.d.ts](./register.d.ts) makes it the default error type:

```ts
const { error } = useQuery({ ... });

if (error) {
  error.kind        // 'network' | 'timeout' | 'validation' | ...
  error.status      // HTTP status, absent for network/timeout/canceled
  error.userMessage // safe to render
  error.code        // backend code, e.g. 'VALIDATION_ERROR'
  error.details     // backend validation payload
}
```

No Axios types leak. Features branch on `error.kind`, not status codes.

## Authentication / Cache Clearing (Phase 7)

When the user logs out or identity changes, sensitive cache must clear:

```ts
import { resetQueryCache } from '@/lib/query';

resetQueryCache(queryClient);
```

This cancels in-flight requests and clears every query and mutation. Public queries (packages, CMS pages) refetch naturally; customer/admin queries disappear.

Not implemented in Phase 6. The function exists; auth will call it.

## SSR / Hydration Strategy

SANAD uses Next.js App Router. Public detail pages (packages, CMS content) later require server-rendered initial data for SEO.

**Hydration pattern (future):** Server Component prefetches the query, dehydrates state, passes to `<HydrationBoundary>`. Client Component reads same key with `useSuspenseQuery`. Pattern documented in Next.js TanStack Query guide, deferred until real queries exist.

Phase 6 QueryClient already configures `dehydrate` to include pending queries (`status === 'pending'`), so a server prefetch that starts but does not await can stream to the client, and the client awaits the same request instead of issuing a second.

**No Cache Components / ISR integration in Phase 6.** Next.js cache coordination (`cacheTag` / `updateTag`) is a future optimization when server-cached data and TanStack Query browser cache must stay synchronized.

## Query Devtools

**Decision:** deferred. No dependency added in Phase 6. When the first real query is implemented, add:

```bash
npm install @tanstack/react-query-devtools
```

Then render in `query-provider.tsx`:

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

Development-only. Zero production bundle impact.

## Client Boundary Discipline

`QueryProvider` is the only `'use client'` component added in Phase 6. Root layout remains a Server Component. Public layout, navbar, footer, all unchanged.

Future query consumers become Client Components only where hooks require it. Server Components stay server until interaction/state demands otherwise.

## Files Added/Modified

**Created:**

- `lib/query/query-client.ts` — QueryClient factory, defaults
- `lib/query/query-keys.ts` — key factory, filter normalization
- `lib/query/retry.ts` — retry predicate, backoff delay
- `lib/query/register.d.ts` — `ApiError` as default error type
- `lib/query/index.ts` — barrel export
- `components/providers/query-provider.tsx` — `'use client'` QueryClientProvider wrapper
- `components/providers/app-providers.tsx` — Server Component provider composition
- `lib/query/README.md` — this file

**Modified:**

- `app/layout.tsx` — wrapped `{children}` in `<AppProviders>`

**No changes to:**

- Design system, UI components, layouts, navbar, footer
- Phase 5 API core
- Backend, database, Prisma schema

## Validation

Before reporting Phase 6 complete:

- TypeScript: `npx tsc --noEmit`
- ESLint: `npm run lint`
- Prettier: `npm run format:check`
- Production build: `npm run build`

All must pass. Temporary verification files removed.

## What Phase 6 Does NOT Include

- Business queries (`usePackages`, `useOrders`, `useNotifications`)
- Domain API modules (`lib/api/modules/*`)
- Real API requests
- Authentication, tokens, Axios auth interceptor
- Route guards, protected routes
- Zustand business state
- Homepage data fetching
- Mock APIs, mock data
- Query persistence (localStorage/IndexedDB)
- Offline-first behavior
- Query devtools (deferred)
- SSR hydration implementation (strategy documented, implementation deferred)
- Cache Components / Next.js ISR integration

Phase 6 is infrastructure. Features build on it in Phase 7+.
