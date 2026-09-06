import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

const ACCESS_SECRET = 'access-secret-value-that-is-long-enough';

const storedUser = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  email: 'user@example.com',
  role: 'customer',
  account_locked: false,
  locked_until: null,
  token_version: 3,
  ...overrides,
});

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: any;

  beforeEach(() => {
    prisma = { users: { findUnique: vi.fn() } };
    const config = {
      getOrThrow: vi.fn(() => ACCESS_SECRET),
    } as unknown as ConfigService;
    strategy = new JwtStrategy(config, prisma as PrismaService);
  });

  const payload = (overrides: Record<string, unknown> = {}) =>
    ({
      sub: 7,
      email: 'user@example.com',
      role: 'customer',
      ver: 3,
      ...overrides,
    }) as never;

  it('resolves the caller to id, email, and role only', async () => {
    prisma.users.findUnique.mockResolvedValue(storedUser());

    await expect(strategy.validate(payload())).resolves.toEqual({
      id: 7,
      email: 'user@example.com',
      role: 'customer',
    });
  });

  it('never selects credential columns during authentication', async () => {
    prisma.users.findUnique.mockResolvedValue(storedUser());

    await strategy.validate(payload());

    const { select } = prisma.users.findUnique.mock.calls[0][0];
    expect(select).not.toHaveProperty('password_hash');
    expect(select.token_version).toBe(true);
  });

  // The role comes from the database on every request, so a role change takes
  // effect without waiting for the access token to expire.
  it('trusts the stored role over the role claim in the token', async () => {
    prisma.users.findUnique.mockResolvedValue(storedUser({ role: 'customer' }));

    await expect(
      strategy.validate(payload({ role: 'super_admin' })),
    ).resolves.toEqual(expect.objectContaining({ role: 'customer' }));
  });

  it.each([
    ['a non-integer subject', { sub: 'seven' }],
    ['a missing subject', { sub: undefined }],
    ['a non-integer version', { ver: '3' }],
    ['a missing version', { ver: undefined }],
  ])('rejects %s without querying the database', async (_label, overrides) => {
    await expect(strategy.validate(payload(overrides))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a token for a deleted account', async () => {
    prisma.users.findUnique.mockResolvedValue(null);

    await expect(strategy.validate(payload())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  // token_version is the revocation mechanism: logout, password change, and an
  // admin lock all increment it, which must invalidate tokens already issued.
  it('rejects a token whose version is behind the stored one', async () => {
    prisma.users.findUnique.mockResolvedValue(storedUser({ token_version: 4 }));

    await expect(strategy.validate(payload({ ver: 3 }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token whose version is ahead of the stored one', async () => {
    prisma.users.findUnique.mockResolvedValue(storedUser({ token_version: 3 }));

    await expect(strategy.validate(payload({ ver: 9 }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an account locked until a future time', async () => {
    prisma.users.findUnique.mockResolvedValue(
      storedUser({
        account_locked: true,
        locked_until: new Date(Date.now() + 60_000),
      }),
    );

    await expect(strategy.validate(payload())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an account locked with no expiry', async () => {
    prisma.users.findUnique.mockResolvedValue(
      storedUser({ account_locked: true, locked_until: null }),
    );

    await expect(strategy.validate(payload())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  // A stale lock window should not keep a customer out once it has elapsed;
  // login clears the flag on the next successful attempt.
  it('admits an account whose lock window has elapsed', async () => {
    prisma.users.findUnique.mockResolvedValue(
      storedUser({
        account_locked: true,
        locked_until: new Date(Date.now() - 60_000),
      }),
    );

    await expect(strategy.validate(payload())).resolves.toEqual(
      expect.objectContaining({ id: 7 }),
    );
  });
});
