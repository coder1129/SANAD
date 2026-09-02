import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  OnModuleDestroy,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface RateLimitRecord {
  count: number;
  reset_at: Date;
}

interface RateLimitedRequest {
  ip?: string;
  socket?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Database-backed rate limiter.
 *
 * Buckets live in the `rate_limit_buckets` table and are updated with a single
 * atomic `INSERT ... ON CONFLICT DO UPDATE`, so the limit is shared correctly
 * across every application instance without extra infrastructure.
 */
@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly cleanupInterval: NodeJS.Timeout;
  private readonly defaultLimit: number;
  private readonly defaultTtl: number;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.defaultLimit = this.configService.get<number>('THROTTLE_LIMIT') ?? 60;
    this.defaultTtl = this.configService.get<number>('THROTTLE_TTL') ?? 60;
    this.cleanupInterval = setInterval(() => void this.cleanup(), 60_000);
    this.cleanupInterval.unref();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();

    const skip = this.reflector.getAllAndOverride<boolean>('skipRateLimit', [
      handler,
      controller,
    ]);
    if (skip) return true;

    const limit =
      this.reflector.get<number>('rateLimit', handler) ??
      this.reflector.get<number>('rateLimit', controller) ??
      this.defaultLimit;

    const ttl =
      this.reflector.get<number>('rateLimitTtl', handler) ??
      this.reflector.get<number>('rateLimitTtl', controller) ??
      this.defaultTtl;

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const key = this.getKey(request, controller.name, handler.name);
    const now = Date.now();
    const newResetTime = new Date(now + ttl * 1000);
    const rows = await this.prisma.$queryRaw<RateLimitRecord[]>`
      INSERT INTO rate_limit_buckets (key, count, reset_at)
      VALUES (${key}, 1, ${newResetTime})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_buckets.reset_at <= NOW() THEN 1
          ELSE rate_limit_buckets.count + 1
        END,
        reset_at = CASE
          WHEN rate_limit_buckets.reset_at <= NOW() THEN EXCLUDED.reset_at
          ELSE rate_limit_buckets.reset_at
        END
      RETURNING count, reset_at
    `;
    const record = rows[0];
    const resetTime = record.reset_at.getTime();


    if (record.count > limit) {
      this.setHeaders(response, limit, 0, resetTime);
      response.setHeader(
        'Retry-After',
        Math.max(1, Math.ceil((resetTime - now) / 1000)),
      );
      throw new HttpException(
        {
          message: 'Too many requests, please try again later',
          code: 'TOO_MANY_REQUESTS',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.setHeaders(
      response,
      limit,
      Math.max(0, limit - record.count),
      resetTime,
    );
    return true;
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }

  private getKey(
    request: RateLimitedRequest,
    controllerName: string,
    handlerName: string,
  ): string {
    return `${this.resolvePrincipal(request)}:${controllerName}:${handlerName}`;
  }

  /**
   * This guard runs ahead of JwtAuthGuard, so `request.user` is not populated
   * yet. The access token is verified here instead — signature and expiry only,
   * no database round-trip — so authenticated callers still get their own
   * bucket rather than sharing one per source IP.
   */
  private resolvePrincipal(request: RateLimitedRequest): string {
    const userId = this.userIdFromBearer(request);
    if (userId !== null) return `user:${userId}`;

    const ip = request.ip || request.socket?.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  private userIdFromBearer(request: RateLimitedRequest): number | null {
    const header = request.headers?.authorization;
    const raw = Array.isArray(header) ? header[0] : header;
    if (!raw?.startsWith('Bearer ')) return null;

    try {
      const payload = this.jwtService.verify(raw.slice(7).trim(), {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        algorithms: ['HS256'],
      });
      return Number.isInteger(payload?.sub) ? (payload.sub as number) : null;
    } catch {
      // Unsigned, forged, or expired token. Fall back to the IP bucket so the
      // request is still throttled before JwtAuthGuard reaches the database.
      return null;
    }
  }

  private setHeaders(
    response: { setHeader(name: string, value: string | number): void },
    limit: number,
    remaining: number,
    resetTime: number,
  ) {
    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
  }

  private async cleanup() {
    try {
      await this.prisma.$executeRaw`
        DELETE FROM rate_limit_buckets
        WHERE reset_at < ${new Date(Date.now() - 5 * 60_000)}
      `;
    } catch {
      // Request handling will surface database availability; cleanup is best-effort.
    }
  }
}

// Decorators for configuring rate limits per handler
import { SetMetadata } from '@nestjs/common';

export const RateLimit = (limit: number) => SetMetadata('rateLimit', limit);
export const RateLimitTtl = (ttl: number) => SetMetadata('rateLimitTtl', ttl);
export const SkipRateLimit = () => SetMetadata('skipRateLimit', true);
