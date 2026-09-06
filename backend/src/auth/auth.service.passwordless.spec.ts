import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';

describe('AuthService - Passwordless Authentication', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let config: any;
  let emailService: any;

  beforeEach(() => {
    prisma = {
      users: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn(),
      },
      user_sessions: {
        findFirst: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: 10 }),
      },
      email_otp_challenges: {
        findFirst: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({ id: 1 }),
      },
      email_queue: {
        create: vi.fn().mockResolvedValue({ id: 1 }),
      },
    };

    jwt = {
      signAsync: vi.fn().mockImplementation((payload: any, options: any) => {
        if (payload.purpose === 'customer_registration') {
          return Promise.resolve('mock-registration-token');
        }
        if (options?.secret === 'refresh-secret') {
          return Promise.resolve('mock-refresh-token');
        }
        return Promise.resolve('mock-access-token');
      }),
      verifyAsync: vi.fn().mockImplementation((token: string) => {
        if (token === 'mock-registration-token') {
          return Promise.resolve({
            email: 'newuser@example.com',
            purpose: 'customer_registration',
          });
        }
        throw new Error('Invalid token');
      }),
    };

    config = {
      get: vi.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'JWT_ACCESS_SECRET':
            return 'access-secret';
          case 'JWT_REFRESH_SECRET':
            return 'refresh-secret';
          case 'JWT_ACCESS_EXPIRES_IN':
            return '15m';
          case 'JWT_REFRESH_EXPIRES_IN':
            return '30d';
          default:
            return undefined;
        }
      }),
    };

    emailService = {
      sendOtpEmail: vi.fn().mockResolvedValue(undefined),
      sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(prisma, jwt, config, emailService);
  });

  describe('requestPasswordlessOtp', () => {
    it('creates a hashed challenge, sends email, and returns generic response with masked email', async () => {
      prisma.email_otp_challenges.findFirst.mockResolvedValue(null);

      const result = await service.requestPasswordlessOtp({
        email: 'customer@example.com',
      });

      expect(result.message).toContain('verification code has been sent');
      expect(result.email).toBe('cu***@example.com');
      expect(prisma.email_otp_challenges.create).toHaveBeenCalledTimes(1);

      const createCall = prisma.email_otp_challenges.create.mock.calls[0][0];
      expect(createCall.data.email).toBe('customer@example.com');
      expect(createCall.data.otp_hash).toBeDefined();
      expect(createCall.data.otp_hash).not.toMatch(/^\d{6}$/); // Hashed, not plain
      expect(emailService.sendOtpEmail).toHaveBeenCalledWith(
        'customer@example.com',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('uses the configured development demo OTP without sending an email', async () => {
      config.get.mockImplementation((key: string) => {
        switch (key) {
          case 'nodeEnv':
            return 'development';
          case 'demo.otpEmail':
            return 'demo@sanad.test';
          case 'demo.otpCode':
            return '123456';
          default:
            return undefined;
        }
      });
      prisma.email_otp_challenges.findFirst.mockResolvedValue(null);

      await service.requestPasswordlessOtp({ email: 'demo@sanad.test' });

      const createCall = prisma.email_otp_challenges.create.mock.calls[0][0];
      const expectedHash = crypto
        .createHash('sha256')
        .update('123456')
        .digest('hex');
      expect(createCall.data.otp_hash).toBe(expectedHash);
      expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
      expect(prisma.email_queue.create).not.toHaveBeenCalled();
    });

    it('enforces 60-second cooldown per email', async () => {
      const recentDate = new Date(Date.now() - 30 * 1000); // 30s ago
      prisma.email_otp_challenges.findFirst.mockResolvedValue({
        id: 5,
        email: 'customer@example.com',
        last_sent_at: recentDate,
      });

      await expect(
        service.requestPasswordlessOtp({ email: 'customer@example.com' }),
      ).rejects.toThrow(HttpException);

      expect(prisma.email_otp_challenges.create).not.toHaveBeenCalled();
    });

    it('allows requesting OTP after 60 seconds have elapsed', async () => {
      const oldDate = new Date(Date.now() - 65 * 1000); // 65s ago
      prisma.email_otp_challenges.findFirst.mockResolvedValue({
        id: 5,
        email: 'customer@example.com',
        last_sent_at: oldDate,
      });

      const result = await service.requestPasswordlessOtp({
        email: 'customer@example.com',
      });

      expect(result.message).toBeDefined();
      expect(prisma.email_otp_challenges.create).toHaveBeenCalledTimes(1);
    });

    it('invalidates prior unconsumed challenges for that email', async () => {
      prisma.email_otp_challenges.findFirst.mockResolvedValue(null);

      await service.requestPasswordlessOtp({ email: 'customer@example.com' });

      expect(prisma.email_otp_challenges.updateMany).toHaveBeenCalledWith({
        where: { email: 'customer@example.com', consumed_at: null },
        data: { consumed_at: expect.any(Date) },
      });
    });
  });

  describe('verifyPasswordlessOtp', () => {
    const rawOtp = '654321';
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    it('throws BadRequestException if no active challenge exists or challenge expired', async () => {
      prisma.email_otp_challenges.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyPasswordlessOtp({
          email: 'customer@example.com',
          otp: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects incorrect OTP and increments attempt count', async () => {
      prisma.email_otp_challenges.findFirst.mockResolvedValue({
        id: 9,
        email: 'customer@example.com',
        otp_hash: otpHash,
        attempt_count: 1,
        expires_at: new Date(Date.now() + 500000),
      });

      await expect(
        service.verifyPasswordlessOtp({
          email: 'customer@example.com',
          otp: '000000',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.email_otp_challenges.update).toHaveBeenCalledWith({
        where: { id: 9 },
        data: { attempt_count: 2 },
      });
    });

    it('locks challenge after 5 incorrect attempts', async () => {
      prisma.email_otp_challenges.findFirst.mockResolvedValue({
        id: 9,
        email: 'customer@example.com',
        otp_hash: otpHash,
        attempt_count: 4,
        expires_at: new Date(Date.now() + 500000),
      });

      await expect(
        service.verifyPasswordlessOtp({
          email: 'customer@example.com',
          otp: '000000',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.email_otp_challenges.update).toHaveBeenCalledWith({
        where: { id: 9 },
        data: {
          attempt_count: 5,
          consumed_at: expect.any(Date),
        },
      });
    });

    it('authenticates existing customer directly without profile step', async () => {
      prisma.email_otp_challenges.findFirst.mockResolvedValue({
        id: 12,
        email: 'customer@example.com',
        otp_hash: otpHash,
        attempt_count: 0,
        expires_at: new Date(Date.now() + 500000),
      });

      const existingUser = {
        id: 42,
        email: 'customer@example.com',
        name: 'Existing Customer',
        first_name: 'Existing',
        last_name: 'Customer',
        role: 'customer',
        token_version: 1,
        account_locked: false,
      };
      prisma.users.findUnique.mockResolvedValue(existingUser);

      const result = await service.verifyPasswordlessOtp({
        email: 'customer@example.com',
        otp: rawOtp,
      });

      expect(result.status).toBe('authenticated');
      if (result.status === 'authenticated') {
        expect(result.accessToken).toBe('mock-access-token');
        expect(result.refreshToken).toBe('mock-refresh-token');
        expect(result.user.id).toBe(42);
      }
      expect(prisma.email_otp_challenges.update).toHaveBeenCalledWith({
        where: { id: 12 },
        data: { consumed_at: expect.any(Date) },
      });
    });

    it('returns profile_required with registrationToken for new customer', async () => {
      prisma.email_otp_challenges.findFirst.mockResolvedValue({
        id: 14,
        email: 'newuser@example.com',
        otp_hash: otpHash,
        attempt_count: 0,
        expires_at: new Date(Date.now() + 500000),
      });
      prisma.users.findUnique.mockResolvedValue(null);

      const result = await service.verifyPasswordlessOtp({
        email: 'newuser@example.com',
        otp: rawOtp,
      });

      expect(result.status).toBe('profile_required');
      if (result.status === 'profile_required') {
        expect(result.registrationToken).toBe('mock-registration-token');
      }
      // User must not be created in DB yet!
      expect(prisma.users.create).not.toHaveBeenCalled();
    });

    it('blocks admin accounts and instructs them to use admin sign-in', async () => {
      prisma.email_otp_challenges.findFirst.mockResolvedValue({
        id: 15,
        email: 'admin@sanad.ae',
        otp_hash: otpHash,
        attempt_count: 0,
        expires_at: new Date(Date.now() + 500000),
      });

      prisma.users.findUnique.mockResolvedValue({
        id: 1,
        email: 'admin@sanad.ae',
        name: 'Super Admin',
        role: 'admin',
      });

      await expect(
        service.verifyPasswordlessOtp({
          email: 'admin@sanad.ae',
          otp: rawOtp,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('completePasswordlessProfile', () => {
    it('creates new customer in DB, enforces role=customer, and returns authenticated session', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      prisma.users.create.mockResolvedValue({
        id: 99,
        email: 'newuser@example.com',
        name: 'Sarah Connor',
        first_name: 'Sarah',
        last_name: 'Connor',
        phone: '+971501234567',
        gender: 'female',
        role: 'customer',
        email_verified: true,
        token_version: 1,
      });

      const result = await service.completePasswordlessProfile({
        registrationToken: 'mock-registration-token',
        firstName: 'Sarah',
        lastName: 'Connor',
        phone: '+971501234567',
        gender: 'female',
      });

      expect(result.status).toBe('authenticated');
      expect(prisma.users.create).toHaveBeenCalledWith({
        data: {
          email: 'newuser@example.com',
          name: 'Sarah Connor',
          first_name: 'Sarah',
          last_name: 'Connor',
          phone: '+971501234567',
          gender: 'female',
          role: 'customer',
          email_verified: true,
          password_hash: null,
        },
      });
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'newuser@example.com',
        'Sarah Connor',
      );
    });

    it('rejects invalid or tampered registrationToken', async () => {
      jwt.verifyAsync.mockRejectedValueOnce(new Error('Invalid signature'));

      await expect(
        service.completePasswordlessProfile({
          registrationToken: 'tampered-token',
          firstName: 'Sarah',
          lastName: 'Connor',
          phone: '+971501234567',
          gender: 'female',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.users.create).not.toHaveBeenCalled();
    });

    it('handles duplicate user race condition safely by signing in existing account', async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: 101,
        email: 'newuser@example.com',
        name: 'Sarah Connor',
        role: 'customer',
        token_version: 1,
      });

      const result = await service.completePasswordlessProfile({
        registrationToken: 'mock-registration-token',
        firstName: 'Sarah',
        lastName: 'Connor',
        phone: '+971501234567',
        gender: 'female',
      });

      expect(result.status).toBe('authenticated');
      expect(prisma.users.create).not.toHaveBeenCalled();
    });
  });
});
