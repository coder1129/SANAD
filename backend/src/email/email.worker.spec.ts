import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailWorker } from './email.worker';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';

const sentry = vi.hoisted(() => {
  const scope = {
    setLevel: vi.fn(),
    setTag: vi.fn(),
    setContext: vi.fn(),
  };
  return {
    scope,
    withScope: vi.fn((callback: (s: unknown) => void) => callback(scope)),
    captureMessage: vi.fn(),
  };
});

vi.mock('@sentry/node', () => ({
  withScope: sentry.withScope,
  captureMessage: sentry.captureMessage,
}));

const queued = (overrides: Record<string, unknown> = {}) => ({
  id: 11,
  recipient_email: 'user@example.com',
  subject: 'Reset your password',
  body_html: '<p>link</p>',
  body_text: 'link',
  template_name: 'password_reset',
  attempts: 1,
  max_attempts: 3,
  ...overrides,
});

describe('EmailWorker', () => {
  let worker: EmailWorker;
  let prisma: any;
  let email: any;

  beforeEach(() => {
    sentry.withScope.mockClear();
    sentry.captureMessage.mockClear();
    sentry.scope.setTag.mockClear();
    sentry.scope.setContext.mockClear();

    prisma = {
      email_queue: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn().mockResolvedValue({}),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
    };
    email = { sendDirect: vi.fn().mockResolvedValue({ success: true }) };
    worker = new EmailWorker(
      prisma as PrismaService,
      email as unknown as EmailService,
    );
  });

  it('returns immediately when a previous tick is still running', async () => {
    (worker as unknown as { isRunning: boolean }).isRunning = true;

    await worker.processEmailQueue();

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('requeues rows left in processing by an interrupted worker', async () => {
    await worker.processEmailQueue();

    const [args] = prisma.email_queue.updateMany.mock.calls[0];
    expect(args.where.status).toBe('processing');
    expect(args.where.updated_at.lt).toBeInstanceOf(Date);
    expect(args.data.status).toBe('pending');
  });

  it('claims rows with SKIP LOCKED so instances never double-send', async () => {
    await worker.processEmailQueue();

    const sql = Array.from(prisma.$queryRaw.mock.calls[0][0] as string[]).join(
      ' ',
    );
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql).toContain("status = 'processing'");
  });

  it('marks a delivered email as sent and clears the error', async () => {
    prisma.$queryRaw.mockResolvedValue([queued()]);

    await worker.processEmailQueue();

    expect(email.sendDirect).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' }),
    );
    expect(prisma.email_queue.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { status: 'sent', sent_at: expect.any(Date), error_message: null },
    });
    expect(sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('reschedules a failed email with exponential backoff', async () => {
    prisma.$queryRaw.mockResolvedValue([queued({ attempts: 2 })]);
    email.sendDirect.mockResolvedValue({ success: false, error: 'smtp 421' });

    const before = Date.now();
    await worker.processEmailQueue();

    const { data } = prisma.email_queue.update.mock.calls[0][0];
    expect(data.status).toBe('pending');
    expect(data.error_message).toBe('smtp 421');
    // Second attempt backs off by 60s * 2^1.
    expect(data.scheduled_at.getTime() - before).toBeGreaterThanOrEqual(
      2 * 60_000 - 50,
    );
    expect(sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('dead-letters at max attempts and raises it to Sentry', async () => {
    prisma.$queryRaw.mockResolvedValue([queued({ attempts: 3 })]);
    email.sendDirect.mockResolvedValue({
      success: false,
      error: 'mailbox full',
    });

    await worker.processEmailQueue();

    const { data } = prisma.email_queue.update.mock.calls[0][0];
    expect(data.status).toBe('failed');
    expect(data.scheduled_at).toBeUndefined();
    expect(sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(sentry.scope.setTag).toHaveBeenCalledWith(
      'email.dead_letter',
      'true',
    );
    expect(sentry.scope.setContext).toHaveBeenCalledWith(
      'email',
      expect.objectContaining({ id: 11, reason: 'mailbox full' }),
    );
  });

  it('dead-letters a thrown provider error at max attempts', async () => {
    prisma.$queryRaw.mockResolvedValue([queued({ attempts: 3 })]);
    email.sendDirect.mockRejectedValue(new Error('socket hang up'));

    await worker.processEmailQueue();

    expect(prisma.email_queue.update.mock.calls[0][0].data.status).toBe(
      'failed',
    );
    expect(sentry.captureMessage).toHaveBeenCalledTimes(1);
  });

  it('keeps retrying a thrown provider error below max attempts', async () => {
    prisma.$queryRaw.mockResolvedValue([queued({ attempts: 1 })]);
    email.sendDirect.mockRejectedValue(new Error('socket hang up'));

    await worker.processEmailQueue();

    expect(prisma.email_queue.update.mock.calls[0][0].data.status).toBe(
      'pending',
    );
    expect(sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('releases the run lock even when the claim query throws', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('database unavailable'));

    await worker.processEmailQueue();

    expect((worker as unknown as { isRunning: boolean }).isRunning).toBe(false);
  });

  it('processes each claimed row independently', async () => {
    prisma.$queryRaw.mockResolvedValue([
      queued({ id: 1 }),
      queued({ id: 2 }),
      queued({ id: 3 }),
    ]);

    await worker.processEmailQueue();

    expect(email.sendDirect).toHaveBeenCalledTimes(3);
    expect(prisma.email_queue.update).toHaveBeenCalledTimes(3);
  });
});
