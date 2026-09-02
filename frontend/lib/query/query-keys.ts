import type { ApiQueryParams } from '@/types/api';

/** Values allowed as a discrete segment of a query key. */
export type QueryKeySegment = string | number | boolean;

/** Identifier segment of a detail key. */
export type QueryKeyId = string | number;

/**
 * Canonicalizes a filter bag before it enters a query key.
 *
 * The goal is that two filter objects producing the same HTTP request also
 * produce the same cache entry. `ApiQueryParams` is reused deliberately: the
 * values in the key are exactly the values the request layer will serialize, so
 * the key cannot drift from the URL it stands for.
 *
 * - `undefined` and `null` are dropped, matching `serializeQueryParams`, so
 *   `{ page: 1, search: null }` and `{ page: 1 }` share one entry.
 * - Empty arrays are dropped for the same reason: they serialize to nothing.
 * - Keys are sorted so the key is byte-stable in devtools and in logs. TanStack
 *   already sorts object keys when hashing, so this is about readability and
 *   stable snapshots rather than cache correctness.
 * - Array order is preserved: it is meaningful on the wire.
 */
export function normalizeQueryFilters(
  filters?: ApiQueryParams,
): ApiQueryParams {
  if (filters === undefined) return {};

  const normalized: ApiQueryParams = {};

  for (const key of Object.keys(filters).sort()) {
    const value = filters[key];

    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      normalized[key] = [...value];
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

/**
 * Key set for one resource, shaped so that every key is a prefix-extension of
 * the one above it. That hierarchy is what makes targeted invalidation possible:
 * invalidating `lists()` leaves `detail(id)` untouched, and invalidating `all`
 * covers the whole resource.
 */
export interface ResourceQueryKeys<TScope extends readonly QueryKeySegment[]> {
  /** Everything for this resource. Broadest invalidation target. */
  all: readonly [...TScope];
  /** Every list of this resource, regardless of filters. */
  lists: () => readonly [...TScope, 'list'];
  /** One list, identified by its normalized filters. */
  list: (
    filters?: ApiQueryParams,
  ) => readonly [...TScope, 'list', ApiQueryParams];
  /** Every detail of this resource. */
  details: () => readonly [...TScope, 'detail'];
  /** One record. */
  detail: (id: QueryKeyId) => readonly [...TScope, 'detail', QueryKeyId];
  /**
   * A sub-resource of one record, e.g. `relation(id, 'files')`. Nested under
   * the record so invalidating `detail(id)` does not touch it, while
   * invalidating `all` does.
   */
  relation: (
    id: QueryKeyId,
    name: string,
  ) => readonly [...TScope, 'detail', QueryKeyId, string];
}

/**
 * Builds the standard key set for a resource. The scope is spread, so nested
 * areas compose: `createResourceQueryKeys('admin', 'orders')` sits under the
 * `['admin']` prefix and is cleared with everything else admin-related.
 *
 * Domain key modules are created alongside the API module they belong to, not
 * here — this file owns the pattern, not the endpoints.
 *
 * ```ts
 * export const orderKeys = createResourceQueryKeys('orders');
 *
 * orderKeys.all;                     // ['orders']
 * orderKeys.list({ page: 2 });       // ['orders', 'list', { page: 2 }]
 * orderKeys.detail(id);              // ['orders', 'detail', id]
 * orderKeys.relation(id, 'files');   // ['orders', 'detail', id, 'files']
 * ```
 */
export function createResourceQueryKeys<
  const TScope extends readonly QueryKeySegment[],
>(...scope: TScope): ResourceQueryKeys<TScope> {
  return {
    all: scope,
    lists: () => [...scope, 'list'],
    list: (filters) => [...scope, 'list', normalizeQueryFilters(filters)],
    details: () => [...scope, 'detail'],
    detail: (id) => [...scope, 'detail', id],
    relation: (id, name) => [...scope, 'detail', id, name],
  };
}
