import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { requestContextStorage } from './request-context';

const REQUEST_ID_HEADER = 'x-request-id';
const MAX_INBOUND_ID_LENGTH = 128;
const SAFE_INBOUND_ID = /^[A-Za-z0-9._:-]+$/;

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const requestId = this.resolveRequestId(request);
    response.setHeader('X-Request-Id', requestId);

    requestContextStorage.run(
      {
        requestId,
        method: request.method,
        path: request.originalUrl || request.url,
      },
      () => next(),
    );
  }

  // An inbound id is echoed only when it is short and free of control
  // characters, so a caller cannot inject newlines into structured logs.
  private resolveRequestId(request: Request): string {
    const inbound = request.headers[REQUEST_ID_HEADER];
    const candidate = Array.isArray(inbound) ? inbound[0] : inbound;

    if (
      candidate &&
      candidate.length <= MAX_INBOUND_ID_LENGTH &&
      SAFE_INBOUND_ID.test(candidate)
    ) {
      return candidate;
    }

    return randomUUID();
  }
}
