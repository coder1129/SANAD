import 'dotenv/config';
import { randomUUID, createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';

describe('OTP concurrency against PostgreSQL', () => {
  const prisma = new PrismaService();
  const emails: string[] = [];
  const service = new AuthService(
    prisma,
    new JwtService(),
    new ConfigService({
      JWT_ACCESS_SECRET: 'test-otp-concurrency-signing-secret-only',
    }),
  );
  const otp = '482913';

  async function challenge() {
    const email = `otp-concurrency-${randomUUID()}@example.invalid`;
    emails.push(email);
    const record = await prisma.email_otp_challenges.create({
      data: {
        email,
        otp_hash: createHash('sha256').update(otp).digest('hex'),
        expires_at: new Date(Date.now() + 60000),
      },
    });
    return { email, id: record.id };
  }

  afterAll(async () => {
    try {
      await prisma.email_otp_challenges.deleteMany({
        where: { email: { in: emails } },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('accepts the same valid code only once under simultaneous requests', async () => {
    const { email } = await challenge();
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        service.verifyPasswordlessOtp({ email, otp }),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(7);
  });

  it('counts simultaneous failures without lost updates and locks at five', async () => {
    const { email, id } = await challenge();
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        service.verifyPasswordlessOtp({ email, otp: '000000' }),
      ),
    );
    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    const row = await prisma.email_otp_challenges.findUniqueOrThrow({
      where: { id },
    });
    expect(row.attempt_count).toBe(5);
    expect(row.consumed_at).not.toBeNull();
    await expect(
      service.verifyPasswordlessOtp({ email, otp }),
    ).rejects.toThrow();
  });
});
