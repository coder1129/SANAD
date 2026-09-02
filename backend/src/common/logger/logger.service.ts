import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino, { Logger as PinoLogger } from 'pino';
import { getRequestContext } from '../context';

type Level = 'info' | 'error' | 'warn' | 'debug' | 'trace';

/**
 * Structured JSON logger. Registered globally via app.useLogger(), so every
 * existing `new Logger(Name)` call in the codebase routes through here without
 * changes at the call sites.
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: PinoLogger;

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const isDevelopment = nodeEnv === 'development';

    this.logger = pino({
      // Tests get a silent logger so suites stay readable.
      level: nodeEnv === 'test' ? 'silent' : isDevelopment ? 'debug' : 'info',
      base: { service: 'sanad-api', env: nodeEnv },
      redact: {
        paths: [
          'password',
          'passwordHash',
          'password_hash',
          'currentPassword',
          'newPassword',
          'token',
          'accessToken',
          'refreshToken',
          'session_token',
          'token_hash',
          'authorization',
          'req.headers.authorization',
          'req.headers.cookie',
        ],
        censor: '[redacted]',
      },
      ...(isDevelopment && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname,service,env',
            messageFormat: '{context} {msg}',
          },
        },
      }),
    });
  }

  log(message: unknown, ...optionalParams: unknown[]) {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    this.write('trace', message, optionalParams);
  }

  /** Emit a log line with explicit structured fields. */
  logWithMeta(level: Level, message: string, meta: Record<string, unknown>) {
    this.logger[level]({ ...this.requestFields(), ...meta }, message);
  }

  private write(level: Level, message: unknown, optionalParams: unknown[]) {
    // Nest passes the logger context as the trailing argument, and an error
    // stack as the argument before it when both are present.
    const params = [...optionalParams];
    const context =
      typeof params[params.length - 1] === 'string'
        ? (params.pop() as string)
        : undefined;
    const trace =
      typeof params[params.length - 1] === 'string'
        ? (params.pop() as string)
        : undefined;

    const payload: Record<string, unknown> = {
      ...this.requestFields(),
      ...(context && { context }),
      ...(trace && { trace }),
      ...(params.length > 0 && { details: params }),
    };

    if (message instanceof Error) {
      payload.err = {
        type: message.name,
        message: message.message,
        stack: message.stack,
      };
      this.logger[level](payload, message.message);
      return;
    }

    if (typeof message === 'object' && message !== null) {
      this.logger[level]({ ...payload, ...message }, 'structured log entry');
      return;
    }

    this.logger[level](payload, String(message));
  }

  private requestFields(): Record<string, unknown> {
    const store = getRequestContext();
    if (!store) return {};

    return {
      requestId: store.requestId,
      ...(store.method && { method: store.method }),
      ...(store.path && { path: store.path }),
    };
  }
}
