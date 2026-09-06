import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { GlobalExceptionFilter } from './global-exception.filter';

const sentry = vi.hoisted(() => {
  const scope = { setLevel: vi.fn(), setTag: vi.fn(), setContext: vi.fn() };
  return {
    scope,
    withScope: vi.fn((callback: (s: unknown) => void) => callback(scope)),
    captureException: vi.fn(),
  };
});

vi.mock('@sentry/node', () => ({
  withScope: sentry.withScope,
  captureException: sentry.captureException,
}));

const requestContext = vi.hoisted(() => ({
  getRequestContext: vi.fn(() => undefined as unknown),
}));

vi.mock('../context', () => ({
  getRequestContext: requestContext.getRequestContext,
}));

const knownRequestError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('database rejected the write', {
    code,
    clientVersion: '6.19.3',
  });

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let json: ReturnType<typeof vi.fn>;
  let status: ReturnType<typeof vi.fn>;
  let host: ArgumentsHost;
  const originalNodeEnv = process.env.NODE_ENV;

  const body = () => json.mock.calls[0][0];

  beforeEach(() => {
    sentry.withScope.mockClear();
    sentry.captureException.mockClear();
    sentry.scope.setTag.mockClear();
    sentry.scope.setContext.mockClear();
    requestContext.getRequestContext.mockReturnValue(undefined);

    json = vi.fn();
    status = vi.fn(() => ({ json }));
    host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    filter = new GlobalExceptionFilter();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('envelope', () => {
    it('always answers with the failure envelope shape', () => {
      filter.catch(new HttpException('Nope', HttpStatus.BAD_REQUEST), host);

      expect(body()).toEqual({
        success: false,
        message: 'Nope',
        code: 'BAD_REQUEST',
        errors: null,
      });
    });

    it('preserves an explicit application error code', () => {
      filter.catch(
        new HttpException(
          { message: 'Coupon has expired', code: 'COUPON_EXPIRED' },
          HttpStatus.BAD_REQUEST,
        ),
        host,
      );

      expect(body().code).toBe('COUPON_EXPIRED');
      expect(body().message).toBe('Coupon has expired');
    });

    it('collapses class-validator output into a validation envelope', () => {
      filter.catch(
        new HttpException(
          { message: ['email must be an email', 'password is too short'] },
          HttpStatus.BAD_REQUEST,
        ),
        host,
      );

      expect(body()).toEqual({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: {
          validation: ['email must be an email', 'password is too short'],
        },
      });
    });

    it.each([
      [HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED'],
      [HttpStatus.FORBIDDEN, 'FORBIDDEN'],
      [HttpStatus.NOT_FOUND, 'NOT_FOUND'],
      [HttpStatus.CONFLICT, 'CONFLICT'],
      [HttpStatus.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS'],
    ])('maps status %i to code %s', (httpStatus, code) => {
      filter.catch(new HttpException({ message: 'x' }, httpStatus), host);

      expect(status).toHaveBeenCalledWith(httpStatus);
      expect(body().code).toBe(code);
    });
  });

  describe('Prisma errors', () => {
    it('translates a unique violation into 409', () => {
      filter.catch(knownRequestError('P2002'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(body().code).toBe('UNIQUE_CONSTRAINT_VIOLATION');
    });

    it('translates a foreign key violation into 409', () => {
      filter.catch(knownRequestError('P2003'), host);

      expect(body().code).toBe('FOREIGN_KEY_CONSTRAINT_VIOLATION');
    });

    it('translates a missing record into 404', () => {
      filter.catch(knownRequestError('P2025'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(body().code).toBe('RECORD_NOT_FOUND');
    });

    // An unmapped Prisma code is a server fault, and its message can carry
    // column values, so it must stay generic on the wire.
    it('keeps an unmapped Prisma error generic and 500', () => {
      filter.catch(knownRequestError('P2037'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body().message).toBe('Internal server error');
      expect(body().message).not.toContain('database rejected');
    });
  });

  describe('upload errors', () => {
    it('maps an oversized upload to 413', () => {
      filter.catch(new MulterError('LIMIT_FILE_SIZE', 'file'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
      expect(body().code).toBe('LIMIT_FILE_SIZE');
    });

    it('maps any other multipart failure to 400', () => {
      filter.catch(new MulterError('LIMIT_UNEXPECTED_FILE', 'file'), host);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(body().message).toBe('Invalid multipart upload');
    });
  });

  describe('unexpected errors', () => {
    it('never leaks the internal message outside development', () => {
      process.env.NODE_ENV = 'production';

      filter.catch(
        new Error('connect ECONNREFUSED 10.0.0.4:5432 as user sanad_app'),
        host,
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body().message).toBe('Internal server error');
      expect(body().code).toBe('INTERNAL_ERROR');
    });

    it('surfaces the message in development for debuggability', () => {
      process.env.NODE_ENV = 'development';

      filter.catch(new Error('boom'), host);

      expect(body().message).toBe('boom');
    });

    it('handles a thrown non-Error value', () => {
      filter.catch('a bare string', host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body().success).toBe(false);
    });
  });

  describe('Sentry reporting', () => {
    // 4xx is the API working as designed; alerting on it buries real incidents.
    it('does not report client errors', () => {
      filter.catch(new HttpException('Nope', HttpStatus.BAD_REQUEST), host);
      filter.catch(new HttpException('Nope', HttpStatus.UNAUTHORIZED), host);
      filter.catch(
        new HttpException('Nope', HttpStatus.TOO_MANY_REQUESTS),
        host,
      );

      expect(sentry.captureException).not.toHaveBeenCalled();
    });

    it('reports server faults', () => {
      const error = new Error('unhandled');

      filter.catch(error, host);

      expect(sentry.captureException).toHaveBeenCalledWith(error);
      expect(sentry.scope.setTag).toHaveBeenCalledWith('http.status', '500');
    });

    it('attaches the correlation id when a request context exists', () => {
      requestContext.getRequestContext.mockReturnValue({
        requestId: 'req-123',
        method: 'POST',
        path: '/api/v1/orders',
      });

      filter.catch(new Error('unhandled'), host);

      expect(sentry.scope.setTag).toHaveBeenCalledWith('request.id', 'req-123');
      expect(sentry.scope.setContext).toHaveBeenCalledWith('request', {
        requestId: 'req-123',
        method: 'POST',
        path: '/api/v1/orders',
      });
    });

    it('still reports when no request context is available', () => {
      filter.catch(new Error('unhandled during bootstrap'), host);

      expect(sentry.captureException).toHaveBeenCalledTimes(1);
      expect(sentry.scope.setContext).not.toHaveBeenCalled();
    });
  });
});
