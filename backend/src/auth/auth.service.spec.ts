import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe('AuthService token security', () => {
  let prisma: any;
  let jwt: any;
  let service: AuthService;

  beforeEach(() => {
    const tx = {
      user_sessions: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: 22 }),
      },
      password_reset_tokens: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      users: { update: vi.fn().mockResolvedValue({}) },
      $executeRaw: vi.fn().mockResolvedValue(1),
    };
    prisma = {
      users: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
      user_sessions: {
        findFirst: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
      },
      password_reset_tokens: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
      },
      email_queue: { create: vi.fn().mockResolvedValue({}) },
      $queryRaw: vi.fn(),
      $transaction: vi.fn(async (input: any) =>
        typeof input === 'function' ? input(tx) : Promise.all(input),
      ),
      __tx: tx,
    };
    jwt = {
      verify: vi.fn().mockReturnValue({ sub: 7, ver: 3 }),
      signAsync: vi.fn((_payload: unknown, options: { secret: string }) =>
        Promise.resolve(
          options.secret === 'refresh-secret-value-that-is-long-enough'
            ? 'rotated-refresh-token'
            : 'new-access-token',
        ),
      ),
    };
    const config = {
      get: vi.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret-value-that-is-long-enough',
          JWT_REFRESH_SECRET: 'refresh-secret-value-that-is-long-enough',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '30d',
          FRONTEND_URL: 'https://sanad.example',
          EMAIL_VERIFICATION_EXPIRES_IN: '24h',
          REQUIRE_EMAIL_VERIFICATION: 'false',
        };
        return values[key];
      }),
    };
    service = new AuthService(prisma, jwt, config as never);
  });

  it('rejects duplicate registration before hashing or creating a user', async () => {
    prisma.users.findUnique.mockResolvedValue({ id: 7 });

    await expect(
      service.register({
        name: 'Existing User',
        email: ' EXISTING@EXAMPLE.COM ',
        password: 'A-Strong-Existing-Passphrase-2026',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.users.findUnique).toHaveBeenCalledWith({
      where: { email: 'existing@example.com' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('locks an account on the fifth failed login attempt', async () => {
    const passwordHash = await argon2.hash('Correct-Passphrase-2026');
    prisma.users.findUnique.mockResolvedValue({
      id: 7,
      email: 'user@example.com',
      password_hash: passwordHash,
      failed_login_attempts: 4,
      account_locked: false,
    });

    await expect(
      service.login({
        email: 'USER@example.com',
        password: 'Wrong-Passphrase-2026',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        failed_login_attempts: 5,
        account_locked: true,
        locked_until: expect.any(Date),
      },
    });
    expect(prisma.user_sessions.create).not.toHaveBeenCalled();
  });

  it('creates a hashed refresh session after a successful login', async () => {
    const passwordHash = await argon2.hash('Correct-Passphrase-2026');
    prisma.users.findUnique.mockResolvedValue({
      id: 7,
      name: 'User',
      email: 'user@example.com',
      role: 'customer',
      token_version: 3,
      password_hash: passwordHash,
      email_verified: true,
      failed_login_attempts: 2,
      account_locked: false,
    });

    await expect(
      service.login({
        email: 'USER@example.com',
        password: 'Correct-Passphrase-2026',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        accessToken: 'new-access-token',
        refreshToken: 'rotated-refresh-token',
      }),
    );
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({
        failed_login_attempts: 0,
        account_locked: false,
        last_login: expect.any(Date),
      }),
    });
    expect(prisma.user_sessions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 7,
        session_token: hash('rotated-refresh-token'),
        is_active: true,
      }),
    });
  });

  it('keeps forgot-password responses generic for unknown emails', async () => {
    prisma.users.findUnique.mockResolvedValue(null);

    await expect(
      service.forgotPassword({ email: 'missing@example.com' }),
    ).resolves.toEqual({
      message: 'If the email exists, a reset link has been sent',
    });
    expect(prisma.password_reset_tokens.create).not.toHaveBeenCalled();
    expect(prisma.email_queue.create).not.toHaveBeenCalled();
  });

  it('rotates refresh tokens and stores only their SHA-256 hashes', async () => {
    prisma.user_sessions.findFirst.mockResolvedValue({ id: 10 });
    prisma.users.findUnique.mockResolvedValue({
      id: 7,
      email: 'user@example.com',
      role: 'customer',
      token_version: 3,
      account_locked: false,
    });

    await expect(
      service.refreshTokens('original-refresh-token'),
    ).resolves.toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'rotated-refresh-token',
    });
    expect(prisma.user_sessions.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        session_token: hash('original-refresh-token'),
      }),
    });
    expect(prisma.__tx.user_sessions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        session_token: hash('rotated-refresh-token'),
      }),
    });
  });

  it('rejects refresh-token reuse when the session was already claimed', async () => {
    prisma.user_sessions.findFirst.mockResolvedValue({ id: 10 });
    prisma.users.findUnique.mockResolvedValue({
      id: 7,
      email: 'user@example.com',
      role: 'customer',
      token_version: 3,
      account_locked: false,
    });
    prisma.__tx.user_sessions.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.refreshTokens('already-used-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('stores a password reset token as a hash instead of plaintext', async () => {
    prisma.users.findUnique.mockResolvedValue({
      id: 7,
      name: '<User>',
      email: 'user@example.com',
    });

    await service.forgotPassword({ email: 'USER@example.com' });

    const stored = prisma.password_reset_tokens.create.mock.calls[0][0].data;
    expect(stored.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored).not.toHaveProperty('token');
    expect(prisma.email_queue.create.mock.calls[0][0].data.body_html).toContain(
      '&lt;User&gt;',
    );
  });

  it('claims reset tokens once and invalidates every existing session', async () => {
    prisma.password_reset_tokens.findUnique.mockResolvedValue({
      id: 31,
      user_id: 7,
      token_hash: hash('reset-token'),
      used: false,
      expires_at: new Date(Date.now() + 60_000),
      users: { id: 7 },
    });

    await expect(
      service.resetPassword({
        token: 'reset-token',
        password: 'A-New-Unique-Passphrase-2026',
      }),
    ).resolves.toEqual({ message: 'Password reset successfully' });
    expect(prisma.password_reset_tokens.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token_hash: hash('reset-token') } }),
    );
    expect(prisma.__tx.users.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ token_version: { increment: 1 } }),
    });
    expect(prisma.__tx.user_sessions.updateMany).toHaveBeenCalledWith({
      where: { user_id: 7 },
      data: { is_active: false },
    });
  });

  it('rejects a reset token that lost a concurrent claim race', async () => {
    prisma.password_reset_tokens.findUnique.mockResolvedValue({
      id: 31,
      user_id: 7,
      used: false,
      expires_at: new Date(Date.now() + 60_000),
      users: { id: 7 },
    });
    prisma.__tx.password_reset_tokens.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      service.resetPassword({
        token: 'reset-token',
        password: 'A-New-Unique-Passphrase-2026',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hashes a supplied refresh token during logout', async () => {
    prisma.user_sessions.updateMany.mockReturnValue(
      Promise.resolve({ count: 1 }),
    );
    prisma.users.update.mockReturnValue(Promise.resolve({}));

    await service.logout(7, 'logout-refresh-token');

    expect(prisma.user_sessions.updateMany).toHaveBeenCalledWith({
      where: {
        user_id: 7,
        session_token: hash('logout-refresh-token'),
      },
      data: { is_active: false },
    });
  });

  it('claims an email verification token once and verifies the user', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 45,
        user_id: 7,
        used: false,
        expires_at: new Date(Date.now() + 60_000),
        email_verified: false,
      },
    ]);

    await expect(
      service.verifyEmail({ token: 'email-verification-token' }),
    ).resolves.toEqual({ message: 'Email verified successfully' });
    expect(prisma.$queryRaw.mock.calls[0].slice(1)).toContain(
      hash('email-verification-token'),
    );
    expect(prisma.__tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(prisma.__tx.users.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { email_verified: true },
    });
  });

  it('rejects an expired email verification token', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 45,
        user_id: 7,
        used: false,
        expires_at: new Date(Date.now() - 1),
        email_verified: false,
      },
    ]);

    await expect(
      service.verifyEmail({ token: 'expired-token' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('resends verification generically and stores only a token hash', async () => {
    prisma.users.findUnique.mockResolvedValue({
      id: 7,
      name: '<User>',
      email: 'user@example.com',
      email_verified: false,
    });

    await expect(
      service.resendVerification({ email: 'USER@example.com' }),
    ).resolves.toEqual({
      message:
        'If the account exists and is unverified, an email has been sent',
    });
    const insertCall = prisma.__tx.$executeRaw.mock.calls[1];
    expect(insertCall[2]).toMatch(/^[a-f0-9]{64}$/);
    expect(prisma.email_queue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipient_email: 'user@example.com',
        body_html: expect.stringContaining('&lt;User&gt;'),
      }),
    });
  });
});
