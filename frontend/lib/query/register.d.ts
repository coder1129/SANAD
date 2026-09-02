import type { ApiError } from '@/lib/api/errors';

/**
 * Registers `ApiError` as TanStack Query's error type.
 *
 * Every rejection reaching the cache comes from the Phase 5 API core, which
 * normalizes all of them, so `error` is an `ApiError` at every call site without
 * per-hook generics: `error.kind`, `error.status`, and `error.userMessage` are
 * available directly, and nothing has to know that Axios exists.
 */
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError;
  }
}
