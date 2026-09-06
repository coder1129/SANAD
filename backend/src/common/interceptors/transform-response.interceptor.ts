import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the data already has a 'success' property, pass through (e.g. paginated)
        // or normalize to ensure data and message fields are present.
        if (data && typeof data === 'object' && 'success' in data) {
          if (data.success === false) {
            return data;
          }
          if ('data' in data && 'message' in data) {
            return data;
          }
          return {
            success: true,
            data: 'data' in data ? (data as Record<string, unknown>).data : null,
            message:
              'message' in data &&
              typeof (data as Record<string, unknown>).message === 'string'
                ? ((data as Record<string, unknown>).message as string)
                : null,
          } as ApiResponse<T>;
        }
        return {
          success: true,
          data: data ?? null,
          message: null,
        };
      }),
    );
  }
}
