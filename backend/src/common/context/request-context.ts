import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
  method?: string;
  path?: string;
}

/**
 * Per-request store used to stamp a correlation id onto every log line without
 * threading a request object through every service signature.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
