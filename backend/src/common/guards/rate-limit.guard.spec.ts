import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RateLimitGuard } from './rate-limit.guard';

function context(response: { setHeader: ReturnType<typeof vi.fn> }) {
  const handler = function login() {};
  class AuthController {}
  return {
    getHandler: () => handler,
    getClass: () => AuthController,
    switchToHttp: () => ({
      getRequest: () => ({ ip: '203.0.113.7' }),
      getResponse: () => response,
    }),
  } as never;
}

describe('RateLimitGuard', () => {
  it('sets headers and permits a request inside the limit', async () => {
    const response = { setHeader: vi.fn() };
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
      get: vi.fn((key: string) => (key === 'rateLimit' ? 2 : 60)),
    };
    const prisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([
          { count: 1, reset_at: new Date(Date.now() + 60_000) },
        ]),
      $executeRaw: vi.fn(),
    };
    const guard = new RateLimitGuard(
      reflector as never,
      { get: vi.fn() } as never,
      prisma as never,
      { verify: vi.fn() } as never,
    );

    await expect(guard.canActivate(context(response))).resolves.toBe(true);
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 2);
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);
    guard.onModuleDestroy();
  });

  it('returns 429 and Retry-After after the limit', async () => {
    const response = { setHeader: vi.fn() };
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
      get: vi.fn((key: string) => (key === 'rateLimit' ? 2 : 60)),
    };
    const prisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([
          { count: 3, reset_at: new Date(Date.now() + 60_000) },
        ]),
      $executeRaw: vi.fn(),
    };
    const guard = new RateLimitGuard(
      reflector as never,
      { get: vi.fn() } as never,
      prisma as never,
      { verify: vi.fn() } as never,
    );

    let thrown: unknown;
    try {
      await guard.canActivate(context(response));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(429);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Retry-After',
      expect.any(Number),
    );
    guard.onModuleDestroy();
  });

  it('does not touch the database for explicitly skipped routes', async () => {
    const prisma = { $queryRaw: vi.fn(), $executeRaw: vi.fn() };
    const guard = new RateLimitGuard(
      {
        getAllAndOverride: vi.fn().mockReturnValue(true),
        get: vi.fn(),
      } as never,
      { get: vi.fn() } as never,
      prisma as never,
      { verify: vi.fn() } as never,
    );

    await expect(
      guard.canActivate(context({ setHeader: vi.fn() })),
    ).resolves.toBe(true);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    guard.onModuleDestroy();
  });
});
