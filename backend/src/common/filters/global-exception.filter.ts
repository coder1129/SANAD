import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import * as Sentry from '@sentry/node';
import { getRequestContext } from '../context';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: string | null = 'INTERNAL_ERROR';
    let errors: Record<string, string[]> | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        // Clear the initial value so the status mapping below assigns a code
        // that matches the status, instead of reporting a 4xx as INTERNAL_ERROR.
        code = null;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        code = (resp.code as string) || null;

        // Handle class-validator errors
        if (Array.isArray(resp.message)) {
          errors = { validation: resp.message as string[] };
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }
      }

      // Map standard HTTP status codes to error codes
      if (!code) {
        switch (status) {
          case HttpStatus.UNAUTHORIZED:
            code = 'UNAUTHORIZED';
            break;
          case HttpStatus.FORBIDDEN:
            code = 'FORBIDDEN';
            break;
          case HttpStatus.NOT_FOUND:
            code = 'NOT_FOUND';
            break;
          case HttpStatus.CONFLICT:
            code = 'CONFLICT';
            break;
          case HttpStatus.TOO_MANY_REQUESTS:
            code = 'TOO_MANY_REQUESTS';
            break;
          case HttpStatus.BAD_REQUEST:
            code = 'BAD_REQUEST';
            break;
          default:
            code = 'ERROR';
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'A record with the same unique value already exists';
          code = 'UNIQUE_CONSTRAINT_VIOLATION';
          break;
        case 'P2003':
          status = HttpStatus.CONFLICT;
          message = 'The operation conflicts with a related record';
          code = 'FOREIGN_KEY_CONSTRAINT_VIOLATION';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'The requested record was not found';
          code = 'RECORD_NOT_FOUND';
          break;
        default:
          this.logger.error('Unhandled database error', exception.stack);
      }
    } else if (exception instanceof MulterError) {
      status =
        exception.code === 'LIMIT_FILE_SIZE'
          ? HttpStatus.PAYLOAD_TOO_LARGE
          : HttpStatus.BAD_REQUEST;
      message =
        exception.code === 'LIMIT_FILE_SIZE'
          ? 'Uploaded file exceeds the allowed size'
          : 'Invalid multipart upload';
      code = exception.code;
    } else {
      // Log unexpected errors but don't expose details in production
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );

      if (
        process.env.NODE_ENV === 'development' &&
        exception instanceof Error
      ) {
        message = exception.message;
      }
    }

    this.reportToSentry(exception, status, code);

    response.status(status).json({
      success: false,
      message,
      code,
      errors,
    });
  }

  // Only server-side faults are worth an alert: 4xx responses are the API
  // working as designed and would bury real incidents in noise.
  private reportToSentry(
    exception: unknown,
    status: number,
    code: string | null,
  ) {
    if (status < HttpStatus.INTERNAL_SERVER_ERROR) return;

    const context = getRequestContext();
    Sentry.withScope((scope) => {
      scope.setLevel('error');
      scope.setTag('http.status', String(status));
      if (code) scope.setTag('error.code', code);
      if (context) {
        scope.setTag('request.id', context.requestId);
        scope.setContext('request', {
          requestId: context.requestId,
          method: context.method,
          path: context.path,
        });
      }
      Sentry.captureException(exception);
    });
  }
}
