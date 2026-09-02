import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// PrismaClient reads the datasource URL when constructed; tests never open a
// connection because $connect/$disconnect are replaced on the instance.
process.env.DATABASE_URL ||=
  'postgresql://postgres:postgres@localhost:5432/sanad_unit_test?schema=public';

describe('PrismaService', () => {
  let service: PrismaService & OnModuleInit & OnModuleDestroy;
  let connect: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new PrismaService();
    connect = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn().mockResolvedValue(undefined);
    Object.assign(service, { $connect: connect, $disconnect: disconnect });
  });

  it('connects once during module initialisation', async () => {
    await service.onModuleInit();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  // Starting with an unreachable database and serving 500s is worse than not
  // starting at all: the container fails its probe and the deploy rolls back.
  it('rethrows a startup connection failure so the process fails fast', async () => {
    connect.mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:5432'));

    await expect(service.onModuleInit()).rejects.toThrow('ECONNREFUSED');
  });

  it('disconnects on shutdown so in-flight queries can drain', async () => {
    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('exposes the Prisma model clients the application depends on', () => {
    for (const model of [
      'users',
      'orders',
      'payments',
      'coupons',
      'email_queue',
      'user_sessions',
    ] as const) {
      expect(service[model]).toBeDefined();
    }
  });
});
