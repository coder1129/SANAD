import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  ver: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    if (!Number.isInteger(payload?.sub) || !Number.isInteger(payload?.ver)) {
      throw new UnauthorizedException({
        message: 'Session is no longer valid',
        code: 'SESSION_INVALID',
      });
    }
    const user = await this.prisma.users.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        account_locked: true,
        locked_until: true,
        token_version: true,
      },
    });

    const isTemporarilyLocked =
      user?.account_locked &&
      (!user.locked_until || user.locked_until.getTime() > Date.now());

    if (!user || isTemporarilyLocked || user.token_version !== payload.ver) {
      throw new UnauthorizedException({
        message: 'Session is no longer valid',
        code: 'SESSION_INVALID',
      });
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
