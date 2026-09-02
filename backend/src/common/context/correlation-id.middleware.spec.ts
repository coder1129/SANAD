import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextFunction, Request, Response } from 'express';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { getRequestContext } from './request-context';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let setHeader: ReturnType<typeof vi.fn>;
  let response: Response;

  const request = (overrides: Record<string, unknown> = {}) =>
    ({
      method: 'POST',
      originalUrl: '/api/v1/orders',
      headers: {},
      ...overrides,
    }) as unknown as Request;

  const assignedId = () => setHeader.mock.calls[0][1] as string;

  beforeEach(() => {
    setHeader = vi.fn();
    response = { setHeader } as unknown as Response;
    middleware = new CorrelationIdMiddleware();
  });

  it('generates a UUID when the caller sends no id', () => {
    middleware.use(request(), response, (() => {}) as NextFunction);

    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
    expect(assignedId()).toMatch(UUID);
  });

  it('echoes a well-formed inbound id so traces span services', () => {
    middleware.use(
      request({ headers: { 'x-request-id': 'edge-7f3a_b1:c2.d3' } }),
      response,
      (() => {}) as NextFunction,
    );

    expect(assignedId()).toBe('edge-7f3a_b1:c2.d3');
  });

  it('takes the first value when the header is repeated', () => {
    middleware.use(
      request({ headers: { 'x-request-id': ['first-id', 'second-id'] } }),
      response,
      (() => {}) as NextFunction,
    );

    expect(assignedId()).toBe('first-id');
  });

  // An inbound id reaches structured logs and a response header, so a caller
  // must not be able to smuggle newlines or control characters through it.
  it.each([
    ['a newline', 'abc\ndef'],
    ['a carriage return', 'abc\r\ndef'],
    ['a space', 'abc def'],
    ['a slash', 'abc/def'],
    ['an empty string', ''],
  ])('rejects an inbound id containing %s', (_label, value) => {
    middleware.use(
      request({ headers: { 'x-request-id': value } }),
      response,
      (() => {}) as NextFunction,
    );

    expect(assignedId()).toMatch(UUID);
  });

  it('rejects an inbound id longer than 128 characters', () => {
    middleware.use(
      request({ headers: { 'x-request-id': 'a'.repeat(129) } }),
      response,
      (() => {}) as NextFunction,
    );

    expect(assignedId()).toMatch(UUID);
  });

  it('accepts an inbound id of exactly 128 characters', () => {
    const boundary = 'a'.repeat(128);

    middleware.use(
      request({ headers: { 'x-request-id': boundary } }),
      response,
      (() => {}) as NextFunction,
    );

    expect(assignedId()).toBe(boundary);
  });

  it('exposes the id, method, and path to downstream code', () => {
    let seen: ReturnType<typeof getRequestContext>;

    middleware.use(
      request({ headers: { 'x-request-id': 'trace-1' } }),
      response,
      (() => {
        seen = getRequestContext();
      }) as NextFunction,
    );

    expect(seen).toEqual({
      requestId: 'trace-1',
      method: 'POST',
      path: '/api/v1/orders',
    });
  });

  it('falls back to url when originalUrl is absent', () => {
    let seen: ReturnType<typeof getRequestContext>;

    middleware.use(
      request({ originalUrl: undefined, url: '/api/v1/health' }),
      response,
      (() => {
        seen = getRequestContext();
      }) as NextFunction,
    );

    expect(seen?.path).toBe('/api/v1/health');
  });

  it('keeps concurrent requests in separate context stores', () => {
    const ids: string[] = [];

    for (const id of ['req-a', 'req-b']) {
      middleware.use(
        request({ headers: { 'x-request-id': id } }),
        { setHeader: vi.fn() } as unknown as Response,
        (() => {
          ids.push(getRequestContext()!.requestId);
        }) as NextFunction,
      );
    }

    expect(ids).toEqual(['req-a', 'req-b']);
  });

  it('leaves no context behind once the request finishes', () => {
    middleware.use(request(), response, (() => {}) as NextFunction);

    expect(getRequestContext()).toBeUndefined();
  });
});
