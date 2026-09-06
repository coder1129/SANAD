import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { TransformResponseInterceptor } from './transform-response.interceptor';

describe('TransformResponseInterceptor', () => {
  let interceptor: TransformResponseInterceptor<unknown>;
  const context = {} as ExecutionContext;

  const run = (value: unknown) => {
    const next: CallHandler = { handle: () => of(value) };
    return firstValueFrom(interceptor.intercept(context, next));
  };

  beforeEach(() => {
    interceptor = new TransformResponseInterceptor();
  });

  it('wraps a plain object in the success envelope', async () => {
    await expect(run({ id: 1 })).resolves.toEqual({
      success: true,
      data: { id: 1 },
      message: null,
    });
  });

  it('wraps an array without flattening it', async () => {
    await expect(run([{ id: 1 }, { id: 2 }])).resolves.toEqual({
      success: true,
      data: [{ id: 1 }, { id: 2 }],
      message: null,
    });
  });

  it('normalizes undefined to null so the field is always present', async () => {
    await expect(run(undefined)).resolves.toEqual({
      success: true,
      data: null,
      message: null,
    });
  });

  it('leaves null as null', async () => {
    await expect(run(null)).resolves.toEqual({
      success: true,
      data: null,
      message: null,
    });
  });

  // Paginated helpers already return the envelope; double-wrapping would break
  // every client that reads data.items.
  it('passes through a payload that is already an envelope', async () => {
    const paginated = {
      success: true,
      data: {
        items: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      },
      message: null,
    };

    await expect(run(paginated)).resolves.toBe(paginated);
  });

  it('passes through a failure envelope unchanged', async () => {
    const failure = {
      success: false,
      message: 'nope',
      code: 'X',
      errors: null,
    };

    await expect(run(failure)).resolves.toBe(failure);
  });

  it('normalizes a success payload missing data to include data: null', async () => {
    await expect(run({ success: true, message: 'Deleted' })).resolves.toEqual({
      success: true,
      data: null,
      message: 'Deleted',
    });
  });

  it('wraps primitives rather than treating them as envelopes', async () => {
    await expect(run('ok')).resolves.toEqual({
      success: true,
      data: 'ok',
      message: null,
    });
    await expect(run(0)).resolves.toEqual({
      success: true,
      data: 0,
      message: null,
    });
  });

  it('subscribes to the handler exactly once', async () => {
    const handle = vi.fn(() => of({ id: 1 }));

    await firstValueFrom(interceptor.intercept(context, { handle }));

    expect(handle).toHaveBeenCalledTimes(1);
  });
});
