import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
} from './dto';
import { Public, CurrentUser } from '../common/decorators';
import { RateLimit, RateLimitTtl } from '../common/guards';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @RateLimit(5)
  @RateLimitTtl(60)
  @ApiOperation({ summary: 'Register a new customer account' })
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @RateLimit(10)
  @RateLimitTtl(60)
  @ApiOperation({ summary: 'Login with email and password' })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @RateLimit(30)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @HttpCode(HttpStatus.OK)
  refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate session' })
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser('id') userId: number, @Body() body?: LogoutDto) {
    return this.authService.logout(userId, body?.refreshToken);
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
  changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }
}
