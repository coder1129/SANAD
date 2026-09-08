import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
  PasswordlessRequestDto,
  PasswordlessVerifyDto,
  PasswordlessCompleteProfileDto,
  GoogleAuthDto,
} from './dto';

interface EmailVerificationTokenRow {
  id: number;
  user_id: number;
  used: boolean | null;
  expires_at: Date;
  email_verified: boolean | null;
}

interface GoogleIdTokenHeader {
  alg?: string;
  kid?: string;
}

interface GoogleIdTokenPayload {
  aud?: string | string[];
  email?: string;
  email_verified?: boolean;
  exp?: number;
  family_name?: string;
  given_name?: string;
  iss?: string;
  name?: string;
  sub?: string;
}

type GoogleJwk = crypto.JsonWebKey & { kid?: string };

/**
 * Fields that may leave the API in a user payload. This is an allowlist, not a
 * denylist: a new column on the users table stays private until it is added
 * here deliberately. Matches the projection UsersService.getProfile selects.
 */
const PUBLIC_USER_FIELDS = [
  'id',
  'name',
  'email',
  'phone',
  'role',
  'email_verified',
  'first_name',
  'last_name',
  'gender',
  'last_login',
  'created_at',
  'updated_at',
] as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleJwksCache: { expiresAt: number; keys: GoogleJwk[] } | null =
    null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.users.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException({
        message: 'Email already registered',
        code: 'EMAIL_EXISTS',
      });
    }

    const passwordHash = await argon2.hash(dto.password);

    const verification = this.createOpaqueToken();
    let user;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.users.create({
          data: {
            name: dto.name.trim(),
            email,
            phone: dto.phone?.trim(),
            password_hash: passwordHash,
            role: 'customer',
            email_verified: false,
          },
        });
        await this.storeEmailVerificationToken(
          tx,
          created.id,
          verification.hash,
        );
        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          message: 'Email already registered',
          code: 'EMAIL_EXISTS',
        });
      }
      throw error;
    }

    await this.queueEmailVerification(user, verification.raw);

    if (this.emailVerificationRequired()) {
      return {
        user: this.sanitizeUser(user),
        verificationRequired: true,
        message: 'Verify your email address before signing in',
      };
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.token_version,
    );
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Check if account is locked
    if (user.account_locked) {
      if (user.locked_until && new Date() < user.locked_until) {
        throw new UnauthorizedException({
          message: 'Account is temporarily locked. Please try again later.',
          code: 'ACCOUNT_LOCKED',
        });
      } else {
        // Lock period expired, unlock account
        await this.prisma.users.update({
          where: { id: user.id },
          data: {
            account_locked: false,
            locked_until: null,
            failed_login_attempts: 0,
          },
        });
      }
    }

    const passwordValid = await this.verifyPassword(
      user.id,
      user.password_hash,
      dto.password,
    );

    if (!passwordValid) {
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const updateData: Record<string, unknown> = {
        failed_login_attempts: failedAttempts,
      };

      // Lock after 5 failed attempts
      if (failedAttempts >= 5) {
        updateData.account_locked = true;
        updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      }

      await this.prisma.users.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedException({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (this.emailVerificationRequired() && !user.email_verified) {
      throw new UnauthorizedException({
        message: 'Verify your email address before signing in',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Reset failed login attempts and update last login
    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: 0,
        account_locked: false,
        locked_until: null,
        last_login: new Date(),
      },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.token_version,
    );
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        algorithms: ['HS256'],
      });

      if (!Number.isInteger(payload.sub) || !Number.isInteger(payload.ver)) {
        throw new UnauthorizedException({
          message: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        });
      }

      // Check session
      const session = await this.prisma.user_sessions.findFirst({
        where: {
          user_id: payload.sub,
          session_token: this.hashOpaqueToken(refreshToken),
          is_active: true,
          expires_at: { gt: new Date() },
        },
      });

      if (!session) {
        throw new UnauthorizedException({
          message: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        });
      }

      const user = await this.prisma.users.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.account_locked || user.token_version !== payload.ver) {
        throw new UnauthorizedException({
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role,
        user.token_version,
      );

      await this.prisma.$transaction(async (tx) => {
        const invalidated = await tx.user_sessions.updateMany({
          where: { id: session.id, is_active: true },
          data: { is_active: false },
        });
        if (invalidated.count !== 1) {
          throw new UnauthorizedException({
            message: 'Refresh token has already been used',
            code: 'REFRESH_TOKEN_REUSED',
          });
        }
        await this.createSession(user.id, tokens.refreshToken, tx);
      });

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }
  }

  async logout(userId: number, refreshToken?: string) {
    await this.prisma.$transaction([
      this.prisma.user_sessions.updateMany({
        where: {
          user_id: userId,
          ...(refreshToken && {
            session_token: this.hashOpaqueToken(refreshToken),
          }),
        },
        data: { is_active: false },
      }),
      this.prisma.users.update({
        where: { id: userId },
        data: { token_version: { increment: 1 } },
      }),
    ]);
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }
    return this.sanitizeUser(user);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = this.hashOpaqueToken(dto.token);
    const rows = await this.prisma.$queryRaw<EmailVerificationTokenRow[]>`
      SELECT token.id,
             token.user_id,
             token.used,
             token.expires_at,
             app_user.email_verified
      FROM email_verification_tokens AS token
      INNER JOIN users AS app_user ON app_user.id = token.user_id
      WHERE token.token_hash = ${tokenHash}
      LIMIT 1
    `;
    const token = rows[0];

    if (
      !token ||
      token.used ||
      token.expires_at <= new Date() ||
      token.email_verified
    ) {
      throw new BadRequestException({
        message: 'Invalid or expired email verification token',
        code: 'INVALID_EMAIL_VERIFICATION_TOKEN',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.$executeRaw`
        UPDATE email_verification_tokens
        SET used = TRUE
        WHERE id = ${token.id}
          AND used = FALSE
          AND expires_at > NOW()
      `;
      if (claimed !== 1) {
        throw new BadRequestException({
          message: 'Invalid or expired email verification token',
          code: 'INVALID_EMAIL_VERIFICATION_TOKEN',
        });
      }

      await tx.users.update({
        where: { id: token.user_id },
        data: { email_verified: true },
      });
      await tx.$executeRaw`
        UPDATE email_verification_tokens
        SET used = TRUE
        WHERE user_id = ${token.user_id} AND used = FALSE
      `;
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.users.findUnique({ where: { email } });
    const generic = {
      message:
        'If the account exists and is unverified, an email has been sent',
    };
    if (!user || user.email_verified) return generic;

    const token = this.createOpaqueToken();
    await this.prisma.$transaction(async (tx) => {
      await this.storeEmailVerificationToken(tx, user.id, token.hash);
    });
    await this.queueEmailVerification(user, token.raw);
    return generic;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.users.findUnique({
      where: { email },
    });

    // Always return success to avoid email enumeration
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashOpaqueToken(rawToken);

    // Invalidate old reset tokens
    await this.prisma.password_reset_tokens.updateMany({
      where: { user_id: user.id, used: false },
      data: { used: true },
    });

    // Store hashed token
    await this.prisma.password_reset_tokens.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Queue email (non-blocking)
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    try {
      await this.prisma.email_queue.create({
        data: {
          recipient_email: email,
          recipient_name: user.name,
          subject: `إعادة تعيين كلمة المرور - Reset Password`,
          body_html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>إعادة تعيين كلمة المرور</h2>
              <p>مرحباً ${this.escapeHtml(user.name)}،</p>
              <p>تم طلب إعادة تعيين كلمة المرور لحسابك.</p>
              <p><a href="${resetLink}" style="background-color: #2196f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">إعادة تعيين كلمة المرور</a></p>
              <p>هذا الرابط صالح لمدة ساعة واحدة.</p>
              <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.</p>
            </div>
          `,
          body_text: `Reset your password: ${resetLink}`,
          template_name: 'password_reset',
          status: 'pending',
          priority: 1,
        },
      });
    } catch (e) {
      this.logger.error('Failed to queue password reset email', e);
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashOpaqueToken(dto.token);
    const matchedToken = await this.prisma.password_reset_tokens.findUnique({
      where: { token_hash: tokenHash },
      include: { users: true },
    });

    if (
      !matchedToken ||
      matchedToken.used ||
      matchedToken.expires_at <= new Date() ||
      !matchedToken.users
    ) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const newPasswordHash = await argon2.hash(dto.password);

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.password_reset_tokens.updateMany({
        where: {
          id: matchedToken.id,
          used: false,
          expires_at: { gt: new Date() },
        },
        data: { used: true },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException(
          'Invalid or expired password reset token',
        );
      }

      await tx.users.update({
        where: { id: matchedToken.users.id },
        data: {
          password_hash: newPasswordHash,
          token_version: { increment: 1 },
        },
      });
      await tx.user_sessions.updateMany({
        where: { user_id: matchedToken.user_id },
        data: { is_active: false },
      });
    });

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    const valid = await this.verifyPassword(
      user.id,
      user.password_hash,
      dto.currentPassword,
    );
    if (!valid) {
      throw new BadRequestException({
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
      });
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.users.update({
        where: { id: userId },
        data: {
          password_hash: passwordHash,
          token_version: { increment: 1 },
        },
      }),
      this.prisma.user_sessions.updateMany({
        where: { user_id: userId },
        data: { is_active: false },
      }),
    ]);

    return { message: 'Password changed successfully' };
  }

  // --- Private Helpers ---

  private async generateTokens(
    userId: number,
    email: string,
    role: string,
    tokenVersion: number,
  ) {
    const payload = { sub: userId, email, role, ver: tokenVersion };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        algorithm: 'HS256',
        expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ||
          '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        algorithm: 'HS256',
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
          '30d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async createSession(
    userId: number,
    token: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const expiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';

    await client.user_sessions.create({
      data: {
        user_id: userId,
        session_token: this.hashOpaqueToken(token),
        expires_at: new Date(Date.now() + this.parseDuration(expiresIn)),
        is_active: true,
      },
    });
  }

  private hashOpaqueToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private createOpaqueToken(): { raw: string; hash: string } {
    const raw = crypto.randomBytes(32).toString('hex');
    return { raw, hash: this.hashOpaqueToken(raw) };
  }

  private async storeEmailVerificationToken(
    client: Prisma.TransactionClient,
    userId: number,
    tokenHash: string,
  ): Promise<void> {
    const expiresIn =
      this.configService.get<string>('EMAIL_VERIFICATION_EXPIRES_IN') || '24h';
    const expiresAt = new Date(Date.now() + this.parseDuration(expiresIn));

    await client.$executeRaw`
      UPDATE email_verification_tokens
      SET used = TRUE
      WHERE user_id = ${userId} AND used = FALSE
    `;
    await client.$executeRaw`
      INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
      VALUES (${userId}, ${tokenHash}, ${expiresAt})
    `;
  }

  private async queueEmailVerification(
    user: { name: string; email: string },
    rawToken: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const verificationLink = `${frontendUrl}/verify-email?token=${rawToken}`;
    const safeName = this.escapeHtml(user.name);

    try {
      await this.prisma.email_queue.create({
        data: {
          recipient_email: user.email,
          recipient_name: user.name,
          subject: 'Verify your SANAD email address',
          body_html: `<div><p>Hello ${safeName},</p><p><a href="${verificationLink}">Verify your email address</a></p><p>This link expires after the configured verification period.</p></div>`,
          body_text: `Verify your email address: ${verificationLink}`,
          template_name: 'email_verification',
          status: 'pending',
          priority: 1,
        },
      });
    } catch (error) {
      this.logger.error('Failed to queue email verification email', error);
    }
  }

  private emailVerificationRequired(): boolean {
    return (
      this.configService.get<boolean>('email.verification.required') === true ||
      this.configService.get<string>('REQUIRE_EMAIL_VERIFICATION') === 'true'
    );
  }

  private async verifyPassword(
    userId: number,
    passwordHash: string | null | undefined,
    password: string,
  ): Promise<boolean> {
    if (!passwordHash) return false;

    if (passwordHash.startsWith('$argon2')) {
      try {
        return await argon2.verify(passwordHash, password);
      } catch {
        return false;
      }
    }

    // One-time migration path for accounts created by the legacy SQL seed,
    // which used PostgreSQL pgcrypto/bcrypt hashes.
    if (passwordHash.startsWith('$2')) {
      try {
        const result = await this.prisma.$queryRaw<Array<{ valid: boolean }>>`
          SELECT ${passwordHash} = crypt(${password}, ${passwordHash}) AS valid
        `;
        if (result[0]?.valid) {
          const upgradedHash = await argon2.hash(password);
          await this.prisma.users.update({
            where: { id: userId },
            data: { password_hash: upgradedHash },
          });
          return true;
        }
      } catch {
        return false;
      }
    }

    return false;
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>'"]/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
        })[character] || character,
    );
  }

  private parseDuration(value: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const amount = Number(match[1]);
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return amount * units[match[2]];
  }

  private sanitizeUser(user: Record<string, unknown>) {
    const sanitized: Record<string, unknown> = {};
    for (const field of PUBLIC_USER_FIELDS) {
      if (field in user) sanitized[field] = user[field];
    }
    return sanitized;
  }

  /**
   * Masks an email address for privacy (e.g. j***@example.com)
   */
  private maskEmail(email: string): string {
    const atIndex = email.indexOf('@');
    if (atIndex <= 0) return email;
    const userPart = email.slice(0, atIndex);
    const domainPart = email.slice(atIndex);
    if (userPart.length <= 2) {
      return `${userPart[0]}***${domainPart}`;
    }
    return `${userPart.slice(0, 2)}***${domainPart}`;
  }

  /**
   * Initiates passwordless authentication by issuing a 6-digit OTP to the provided email.
   * Explicit sign-in/sign-up flows fail early when the account state does not
   * match; legacy callers retain the generic response during migration.
   */
  async requestPasswordlessOtp(dto: PasswordlessRequestDto) {
    const email = dto.email.toLowerCase().trim();

    // Explicit sign-in and sign-up are separate products. Legacy callers that
    // omit `flow` retain the old non-enumerating behaviour during migration.
    if (dto.flow) {
      const user = await this.prisma.users.findUnique({ where: { email } });
      if (dto.flow === 'sign_in' && !user) {
        throw new UnauthorizedException({
          message: 'No customer account exists for this email.',
          code: 'ACCOUNT_NOT_FOUND',
        });
      }
      if (dto.flow === 'sign_up' && user) {
        throw new ConflictException({
          message: 'An account already exists for this email.',
          code: 'EMAIL_EXISTS',
        });
      }
      if (dto.flow === 'sign_in' && user?.role !== 'customer') {
        throw new UnauthorizedException({
          message: 'This account must use the administrator sign-in.',
          code: 'ADMIN_SIGN_IN_REQUIRED',
        });
      }
    }

    // 1. Rate-limiting: Enforce 60-second cooldown per email
    const latestChallenge = await this.prisma.email_otp_challenges.findFirst({
      where: { email },
      orderBy: { created_at: 'desc' },
    });

    if (latestChallenge && latestChallenge.last_sent_at) {
      const elapsedMs = Date.now() - latestChallenge.last_sent_at.getTime();
      if (elapsedMs < 60_000) {
        const retryAfter = Math.ceil((60_000 - elapsedMs) / 1000);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Please wait before requesting another code.',
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // 2. Invalidate any unconsumed challenges for this email
    await this.prisma.email_otp_challenges.updateMany({
      where: { email, consumed_at: null },
      data: { consumed_at: new Date() },
    });

    // 3. Generate cryptographically secure 6-digit OTP
    const demoOtp = this.getDemoOtp(email);
    const otp = demoOtp ?? crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 4. Save challenge record
    await this.prisma.email_otp_challenges.create({
      data: {
        email,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempt_count: 0,
        last_sent_at: new Date(),
      },
    });

    // 5. Send email (never log plaintext OTP in production)
    try {
      if (demoOtp) {
        this.logger.warn(
          `Demo OTP mode is active for ${email}; email delivery skipped`,
        );
      } else if (this.emailService) {
        await this.emailService.sendOtpEmail(email, otp);
      } else {
        await this.prisma.email_queue.create({
          data: {
            recipient_email: email,
            subject: 'Your SANAD verification code',
            body_html: `<div><p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p></div>`,
            body_text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
            template_name: 'otp_verification',
            priority: 1,
            status: 'pending',
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
    }

    // 6. Generic response - never leaks whether the account exists
    return {
      message: 'If the email is valid, a verification code has been sent',
      email: this.maskEmail(email),
    };
  }

  private getDemoOtp(email: string): string | null {
    const nodeEnv =
      this.configService.get<string>('nodeEnv') || process.env.NODE_ENV;
    const demoEmail =
      this.configService.get<string>('demo.otpEmail') ||
      process.env.DEMO_OTP_EMAIL;
    const demoCode =
      this.configService.get<string>('demo.otpCode') ||
      process.env.DEMO_OTP_CODE;

    if (
      nodeEnv !== 'development' ||
      !demoEmail ||
      !demoCode ||
      email !== demoEmail.trim().toLowerCase() ||
      !/^\d{6}$/.test(demoCode.trim())
    ) {
      return null;
    }

    return demoCode.trim();
  }

  /**
   * Verifies the 6-digit OTP.
   * Sign-in can authenticate only an existing customer; sign-up can issue a
   * registration token only for a new customer.
   * If admin account -> informs user to use administrator sign-in.
   */
  async verifyPasswordlessOtp(dto: PasswordlessVerifyDto) {
    const email = dto.email.toLowerCase().trim();
    const otp = dto.otp.trim();

    // Compare-and-swap retries serialize attempts across API instances. A stale
    // reader must never consume an already used code or overwrite an attempt.
    let consumed = false;
    for (let retry = 0; retry < 6; retry += 1) {
      const challenge = await this.prisma.email_otp_challenges.findFirst({
        where: {
          email,
          consumed_at: null,
          expires_at: { gt: new Date() },
        },
        orderBy: { created_at: 'desc' },
      });

      if (!challenge || challenge.attempt_count >= 5) {
        throw new BadRequestException({
          message: 'This verification code has expired.',
          code: 'OTP_EXPIRED',
        });
      }

      // 2. Compare SHA-256 hash using timingSafeEqual
      const candidateHash = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');
      const hashBuffer = Buffer.from(challenge.otp_hash, 'hex');
      const candidateBuffer = Buffer.from(candidateHash, 'hex');
      const isValid =
        hashBuffer.length === candidateBuffer.length &&
        crypto.timingSafeEqual(hashBuffer, candidateBuffer);

      if (!isValid) {
        const newAttempts = challenge.attempt_count + 1;
        const updated = await this.prisma.email_otp_challenges.updateMany({
          where: {
            id: challenge.id,
            consumed_at: null,
            expires_at: { gt: new Date() },
            attempt_count: challenge.attempt_count,
          },
          data: {
            attempt_count: newAttempts,
            ...(newAttempts >= 5 ? { consumed_at: new Date() } : {}),
          },
        });
        if (updated.count === 0) continue;

        if (newAttempts >= 5) {
          throw new BadRequestException({
            message:
              'Too many incorrect attempts. This verification code has expired.',
            code: 'OTP_MAX_ATTEMPTS',
          });
        }

        throw new BadRequestException({
          message: 'Incorrect verification code.',
          code: 'OTP_INVALID',
        });
      }

      // 3. Mark challenge consumed immediately
      const updated = await this.prisma.email_otp_challenges.updateMany({
        where: {
          id: challenge.id,
          consumed_at: null,
          expires_at: { gt: new Date() },
          attempt_count: challenge.attempt_count,
        },
        data: { consumed_at: new Date() },
      });
      if (updated.count === 0) continue;
      consumed = true;
      break;
    }
    if (!consumed) {
      throw new BadRequestException({
        message: 'This verification code has expired.',
        code: 'OTP_EXPIRED',
      });
    }

    // 4. Check if account already exists
    const user = await this.prisma.users.findUnique({
      where: { email },
    });

    if (user) {
      if (dto.flow === 'sign_up') {
        throw new ConflictException({
          message: 'An account already exists for this email.',
          code: 'EMAIL_EXISTS',
        });
      }

      // Check if user is an admin
      if (user.role !== 'customer') {
        throw new UnauthorizedException({
          message: 'This account must use the administrator sign-in.',
          code: 'ADMIN_SIGN_IN_REQUIRED',
        });
      }

      // Check account lockout
      if (
        user.account_locked &&
        user.locked_until &&
        new Date() < user.locked_until
      ) {
        throw new UnauthorizedException({
          message: 'Account is temporarily locked. Please try again later.',
          code: 'ACCOUNT_LOCKED',
        });
      }

      // Reset failed attempts, mark email verified, record login
      await this.prisma.users.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: 0,
          account_locked: false,
          locked_until: null,
          last_login: new Date(),
          email_verified: true,
        },
      });

      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role,
        user.token_version,
      );
      await this.createSession(user.id, tokens.refreshToken);

      return {
        status: 'authenticated' as const,
        user: this.sanitizeUser(user),
        ...tokens,
      };
    }

    if (dto.flow === 'sign_in') {
      throw new UnauthorizedException({
        message: 'No customer account exists for this email.',
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    // 5. New customer -> issue short-lived, purpose-bound registration token
    const registrationToken = await this.jwtService.signAsync(
      {
        email,
        purpose: 'customer_registration',
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );

    return {
      status: 'profile_required' as const,
      registrationToken,
    };
  }

  /**
   * Signs in an existing customer or starts a new Google-backed registration.
   * The browser credential is verified against Google's rotating JWKS before
   * any account lookup, token issue, or profile data is trusted.
   */
  async authenticateWithGoogle(dto: GoogleAuthDto) {
    const googleProfile = await this.verifyGoogleIdToken(dto.credential);
    const email = googleProfile.email.toLowerCase().trim();
    const googleLinkedUser = await this.prisma.users.findUnique({
      where: { google_subject: googleProfile.subject },
    });
    const user =
      googleLinkedUser ??
      (await this.prisma.users.findUnique({ where: { email } }));

    if (user) {
      if (user.role !== 'customer') {
        throw new UnauthorizedException({
          message: 'This account must use the administrator sign-in.',
          code: 'ADMIN_SIGN_IN_REQUIRED',
        });
      }
      if (dto.flow === 'sign_up') {
        throw new ConflictException({
          message: 'An account already exists for this Google email.',
          code: 'EMAIL_EXISTS',
        });
      }
      if (
        user.google_subject &&
        user.google_subject !== googleProfile.subject
      ) {
        throw new UnauthorizedException({
          message: 'This email is linked to a different Google account.',
          code: 'GOOGLE_ACCOUNT_MISMATCH',
        });
      }
      if (
        user.account_locked &&
        user.locked_until &&
        new Date() < user.locked_until
      ) {
        throw new UnauthorizedException({
          message: 'Account is temporarily locked. Please try again later.',
          code: 'ACCOUNT_LOCKED',
        });
      }

      await this.prisma.users.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: 0,
          account_locked: false,
          locked_until: null,
          last_login: new Date(),
          email_verified: true,
          google_subject: user.google_subject ?? googleProfile.subject,
        },
      });

      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role,
        user.token_version,
      );
      await this.createSession(user.id, tokens.refreshToken);

      return {
        status: 'authenticated' as const,
        user: this.sanitizeUser(user),
        ...tokens,
      };
    }

    if (dto.flow === 'sign_in') {
      throw new UnauthorizedException({
        message: 'No customer account exists for this Google email.',
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    const registrationToken = await this.jwtService.signAsync(
      {
        email,
        purpose: 'google_registration',
        googleSubject: googleProfile.subject,
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );

    return {
      status: 'profile_required' as const,
      registrationToken,
      profile: {
        email,
        firstName: googleProfile.firstName,
        lastName: googleProfile.lastName,
      },
    };
  }

  private async verifyGoogleIdToken(credential: string): Promise<{
    email: string;
    firstName: string;
    lastName: string;
    subject: string;
  }> {
    const clientId = this.configService.get<string>('google.clientId')?.trim();
    if (!clientId) {
      throw new HttpException(
        {
          message: 'Google authentication is not configured.',
          code: 'GOOGLE_AUTH_NOT_CONFIGURED',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      const parts = credential.split('.');
      if (parts.length !== 3) throw new Error('Malformed credential');

      const header = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf8'),
      ) as GoogleIdTokenHeader;
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as GoogleIdTokenPayload;

      if (header.alg !== 'RS256' || !header.kid) {
        throw new Error('Unsupported Google token header');
      }

      const keys = await this.getGoogleJwks();
      const jwk = keys.find((candidate) => candidate.kid === header.kid);
      if (!jwk) throw new Error('Unknown Google signing key');

      const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
      const signature = Buffer.from(parts[2], 'base64url');
      const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
      if (!crypto.verify('RSA-SHA256', signingInput, publicKey, signature)) {
        throw new Error('Invalid Google token signature');
      }

      const audienceMatches = Array.isArray(payload.aud)
        ? payload.aud.includes(clientId)
        : payload.aud === clientId;
      const issuerMatches =
        payload.iss === 'accounts.google.com' ||
        payload.iss === 'https://accounts.google.com';
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (
        !audienceMatches ||
        !issuerMatches ||
        typeof payload.exp !== 'number' ||
        payload.exp <= nowInSeconds ||
        payload.email_verified !== true ||
        typeof payload.email !== 'string' ||
        typeof payload.sub !== 'string'
      ) {
        throw new Error('Invalid Google token claims');
      }

      const displayName = payload.name?.trim() ?? '';
      const [fallbackFirst = '', ...fallbackLastParts] =
        displayName.split(/\s+/);
      return {
        email: payload.email,
        firstName: payload.given_name?.trim() || fallbackFirst,
        lastName:
          payload.family_name?.trim() || fallbackLastParts.join(' ').trim(),
        subject: payload.sub,
      };
    } catch (error) {
      this.logger.warn(
        `Rejected Google identity credential: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new UnauthorizedException({
        message: 'Google authentication failed. Please try again.',
        code: 'INVALID_GOOGLE_CREDENTIAL',
      });
    }
  }

  private async getGoogleJwks(): Promise<GoogleJwk[]> {
    if (this.googleJwksCache && this.googleJwksCache.expiresAt > Date.now()) {
      return this.googleJwksCache.keys;
    }

    const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`Google JWKS request failed with ${response.status}`);
    }

    const body = (await response.json()) as { keys?: GoogleJwk[] };
    if (!Array.isArray(body.keys) || body.keys.length === 0) {
      throw new Error('Google JWKS response did not contain keys');
    }

    const maxAgeMatch = response.headers
      .get('cache-control')
      ?.match(/max-age=(\d+)/i);
    const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
    this.googleJwksCache = {
      expiresAt: Date.now() + Math.max(60, maxAgeSeconds) * 1000,
      keys: body.keys,
    };
    return body.keys;
  }

  /**
   * Completes profile registration for a new verified customer.
   */
  async completePasswordlessProfile(dto: PasswordlessCompleteProfileDto) {
    // 1. Verify and decode registration token
    let payload: Record<string, unknown>;
    try {
      payload = await this.jwtService.verifyAsync(dto.registrationToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException({
        message:
          'Registration session expired or invalid. Please sign in again.',
        code: 'INVALID_REGISTRATION_TOKEN',
      });
    }

    if (
      !['customer_registration', 'google_registration'].includes(
        String(payload.purpose),
      ) ||
      typeof payload.email !== 'string'
    ) {
      throw new BadRequestException({
        message: 'Invalid registration session token.',
        code: 'INVALID_REGISTRATION_TOKEN',
      });
    }

    const email = payload.email.toLowerCase().trim();
    const googleSubject =
      payload.purpose === 'google_registration' &&
      typeof payload.googleSubject === 'string'
        ? payload.googleSubject
        : null;
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const phone = dto.phone.trim();
    const gender = dto.gender;
    const fullName = `${firstName} ${lastName}`.trim();

    // 2. Handle duplicate race condition safely
    const existingUser = googleSubject
      ? await this.prisma.users.findFirst({
          where: {
            OR: [{ email }, { google_subject: googleSubject }],
          },
        })
      : await this.prisma.users.findUnique({ where: { email } });

    if (existingUser) {
      if (existingUser.role !== 'customer') {
        throw new UnauthorizedException({
          message: 'This account must use the administrator sign-in.',
          code: 'ADMIN_SIGN_IN_REQUIRED',
        });
      }
      throw new ConflictException({
        message: 'An account already exists for this email.',
        code: 'EMAIL_EXISTS',
      });
    }

    // 3. Create new customer user with role strictly customer
    const user = await this.prisma.users.create({
      data: {
        email,
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        phone,
        gender,
        ...(googleSubject ? { google_subject: googleSubject } : {}),
        role: 'customer',
        email_verified: true,
        password_hash: null,
      },
    });

    // 4. Send welcome email (fire and forget)
    if (this.emailService) {
      this.emailService.sendWelcomeEmail(user.email, user.name).catch((err) => {
        this.logger.error(`Failed to send welcome email to ${user.email}`, err);
      });
    }

    // 5. Issue tokens and create session
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.token_version,
    );
    await this.createSession(user.id, tokens.refreshToken);

    return {
      status: 'authenticated' as const,
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }
}
