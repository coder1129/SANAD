export type SortOrder = 'asc' | 'desc';

/**
 * Metadata attached to every paginated payload. Field names mirror the
 * backend's `createPaginatedResponse` helper exactly.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Shape of `data` for paginated endpoints. */
export interface PaginatedData<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Query parameters shared by every paginated endpoint (the backend's
 * `PaginationDto`). Omitted values fall back to the server defaults:
 * `page` 1, `limit` 20, `sortOrder` 'desc'. `limit` is capped at 100 server-side.
 *
 * Declared as a type alias rather than an interface so it stays assignable to
 * `ApiQueryParams` — interfaces get no implicit index signature.
 */
export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
};
