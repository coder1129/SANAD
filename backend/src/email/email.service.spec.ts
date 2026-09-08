import { describe, it, expect, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

describe('EmailService provider delivery', () => {
  const message = {
    to: 'test@example.invalid',
    subject: 'OTP',
    bodyHtml: 'test',
  };
  const createService = (
    values: Record<string, string> = { RESEND_API_KEY: 're_test' },
  ) => new EmailService(new ConfigService(values), {} as PrismaService);

  it('reports a resolved provider error as failure so the worker retries', async () => {
    send.mockResolvedValueOnce({
      data: null,
      error: { message: 'Rate limit exceeded' },
    });
    expect(await createService().sendDirect(message)).toEqual({
      success: false,
      error: 'Rate limit exceeded',
    });
  });

  it('does not acknowledge a response without a message ID', async () => {
    send.mockResolvedValueOnce({ data: null, error: null });
    expect(await createService().sendDirect(message)).toMatchObject({
      success: false,
    });
  });

  it('acknowledges an accepted message', async () => {
    send.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });
    expect(await createService().sendDirect(message)).toEqual({
      success: true,
      id: 'email-1',
    });
  });

  it('refuses simulated delivery in production, including placeholder credentials', () => {
    expect(() =>
      createService({
        NODE_ENV: 'production',
        RESEND_API_KEY: 're_placeholder',
      }),
    ).toThrow(/Production requires/);
  });
});
