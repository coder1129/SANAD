import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, OPTIONAL_AUTH_KEY } from '../../common/decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const hasOptionalAuth = this.reflector.getAllAndOverride<boolean>(
      OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic && !hasOptionalAuth) {
      return true;
    }

    // Passport's JWT guard permits anonymous requests only when its strategy
    // is not run. Optional-auth routes therefore bypass it when no bearer
    // token was supplied, but validate and attach request.user when one was.
    if (isPublic && hasOptionalAuth) {
      const request = context.switchToHttp().getRequest();
      if (!request.headers.authorization) return true;
    }

    return super.canActivate(context);
  }
}
