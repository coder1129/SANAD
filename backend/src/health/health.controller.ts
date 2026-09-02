import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators';
import { Response } from 'express';
import { SkipRateLimit } from '../common/guards';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipRateLimit()
  @Get()
  @ApiOperation({
    summary: 'System health check and database connectivity probe',
  })
  async check(@Res({ passthrough: true }) response: Response) {
    const database = await this.probeDatabase();
    if (database.status !== 'connected') response.status(503);

    return {
      status: database.status === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      database: {
        status: database.status,
        latency_ms: database.latencyMs,
      },
    };
  }

  /**
   * Liveness: is the process itself healthy? Deliberately does not touch the
   * database, so a database blip never makes an orchestrator kill healthy pods.
   */
  @Public()
  @SkipRateLimit()
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe (process only, no dependencies)' })
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
    };
  }

  /**
   * Readiness: should this instance receive traffic? Fails with 503 while the
   * database is unreachable so a load balancer drains it instead of serving 500s.
   */
  @Public()
  @SkipRateLimit()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (verifies database connectivity)' })
  async ready(@Res({ passthrough: true }) response: Response) {
    const database = await this.probeDatabase();
    const ready = database.status === 'connected';
    if (!ready) response.status(503);

    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: database.status,
          latency_ms: database.latencyMs,
        },
      },
    };
  }

  private async probeDatabase(): Promise<{
    status: 'connected' | 'disconnected';
    latencyMs: number;
  }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'connected', latencyMs: Date.now() - start };
    } catch {
      return { status: 'disconnected', latencyMs: 0 };
    }
  }
}
