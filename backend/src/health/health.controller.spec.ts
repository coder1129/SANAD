import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Response } from 'express';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: any;
  let response: Response;
  let status: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    prisma = { $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]) };
    status = vi.fn();
    response = { status } as unknown as Response;
    controller = new HealthController(prisma as PrismaService);
  });

  describe('GET /health', () => {
    it('reports ok while the database answers', async () => {
      const result = await controller.check(response);

      expect(result.status).toBe('ok');
      expect(result.database.status).toBe('connected');
      expect(status).not.toHaveBeenCalled();
    });

    it('reports degraded with a 503 when the database is unreachable', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await controller.check(response);

      expect(result.status).toBe('degraded');
      expect(result.database.status).toBe('disconnected');
      expect(status).toHaveBeenCalledWith(503);
    });

    it('includes process uptime and a timestamp', async () => {
      const result = await controller.check(response);

      expect(typeof result.uptime_seconds).toBe('number');
      expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
    });
  });

  describe('GET /health/live', () => {
    // Liveness must not depend on the database: a database blip should not make
    // an orchestrator restart otherwise-healthy pods.
    it('never touches the database', () => {
      const result = controller.live();

      expect(result.status).toBe('ok');
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/ready', () => {
    it('reports ready when the database answers', async () => {
      const result = await controller.ready(response);

      expect(result.status).toBe('ready');
      expect(result.checks.database.status).toBe('connected');
      expect(status).not.toHaveBeenCalled();
    });

    // Readiness failing is what drains this instance from the load balancer
    // instead of letting it serve 500s.
    it('fails with a 503 so the load balancer drains this instance', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await controller.ready(response);

      expect(result.status).toBe('not_ready');
      expect(status).toHaveBeenCalledWith(503);
    });

    it('measures database latency on the happy path', async () => {
      const result = await controller.ready(response);

      expect(result.checks.database.latency_ms).toBeGreaterThanOrEqual(0);
    });
  });
});
