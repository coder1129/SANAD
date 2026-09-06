import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  LogoutDto,
  VerifyEmailDto,
  ResendVerificationDto,
  PasswordlessRequestDto,
  PasswordlessVerifyDto,
  PasswordlessCompleteProfileDto,
} from './dto';
import { Public, CurrentUser } from '../common/decorators';
import { RateLimit, RateLimitTtl } from '../common/guards';
import { durationToMs, toDuration } from '../config';

const REFRESH_COOKIE_NAME = 'sanad_refresh_token';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @RateLimit(5)
  @RateLimitTtl(60)
  @ApiOperation({ summary: 'Register a new customer account' })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.publishSession(response, await this.authService.register(dto));
  }

  @Public()
  @Post('login')
  @RateLimit(10)
  @RateLimitTtl(60)
  @ApiOperation({ summary: 'Login with email and password' })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.publishSession(response, await this.authService.login(dto));
  }

  @Public()
  @Post('refresh')
  @RateLimit(30)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      this.readRefreshCookie(request.headers.cookie) ?? dto?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException({
        message: 'Refresh token is required',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    try {
      return this.publishSession(
        response,
        await this.authService.refreshTokens(refreshToken),
      );
    } catch (error) {
      this.clearRefreshCookie(response);
      throw error;
    }
  }

  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate session' })
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: number,
    @Body() body: LogoutDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      this.readRefreshCookie(request.headers.cookie) ?? body?.refreshToken;

    try {
      return await this.authService.logout(userId, refreshToken);
    } finally {
      this.clearRefreshCookie(response);
    }
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  getMe(@CurrentUser('id') userId: number) {
    return this.authService.getMe(userId);
  }

  @Public()
  @Post('verify-email')
  @RateLimit(10)
  @RateLimitTtl(60)
  @ApiOperation({ summary: 'Confirm an email address using its token' })
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('resend-verification')
  @RateLimit(3)
  @RateLimitTtl(60)
  @ApiOperation({
    summary: 'Send a fresh verification email if the account exists',
  })
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Public()
  @Post('forgot-password')
  @RateLimit(3)
  @RateLimitTtl(60)
  @ApiOperation({ summary: 'Request password reset email' })
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @RateLimit(5)
  @RateLimitTtl(60)
  @ApiOperation({ summary: 'Reset password using token' })
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiBearerAuth()
  @Post('change-password')
  @RateLimit(5)
  @RateLimitTtl(60)
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.changePassword(userId, dto);
    this.clearRefreshCookie(response);
    return result;
  }

  @Public()
  @Post('passwordless/request')
  @RateLimit(5)
  @RateLimitTtl(60)
  @ApiOperation({ summary: 'Request a passwordless verification OTP code' })
  @HttpCode(HttpStatus.OK)
  requestPasswordlessOtp(@Body() dto: PasswordlessRequestDto) {
    return this.authService.requestPasswordlessOtp(dto);
  }

  @Public()
  @Post('passwordless/verify')
  @RateLimit(10)
  @RateLimitTtl(60)
  @ApiOperation({ summary: 'Verify passwordless OTP code' })
  @HttpCode(HttpStatus.OK)
  async verifyPasswordlessOtp(
    @Body() dto: PasswordlessVerifyDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.publishSession(
      response,
      await this.authService.verifyPasswordlessOtp(dto),
    );
  }

  @Public()
  @Post('passwordless/complete-profile')
  @RateLimit(5)
  @RateLimitTtl(60)
  @ApiOperation({ summary: 'Complete profile for verified new customer' })
  @HttpCode(HttpStatus.CREATED)
  async completePasswordlessProfile(
    @Body() dto: PasswordlessCompleteProfileDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.publishSession(
      response,
      await this.authService.completePasswordlessProfile(dto),
    );
  }

  private publishSession<T extends object>(response: Response, result: T) {
    if (
      !('refreshToken' in result) ||
      typeof result.refreshToken !== 'string'
    ) {
      return result;
    }

    response.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      maxAge: durationToMs(
        toDuration(
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
          '30d',
        ),
      ),
      path: '/api/v1/auth',
      sameSite: 'lax',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
    });

    const { refreshToken: _refreshToken, ...publicResult } = result;
    return publicResult;
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      path: '/api/v1/auth',
      sameSite: 'lax',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
    });
  }

  private readRefreshCookie(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) return null;

    for (const pair of cookieHeader.split(';')) {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex < 0) continue;

      const name = pair.slice(0, separatorIndex).trim();
      if (name !== REFRESH_COOKIE_NAME) continue;

      const encodedValue = pair.slice(separatorIndex + 1).trim();
      try {
        return decodeURIComponent(encodedValue);
      } catch {
        return null;
      }
    }

    return null;
  }
}
