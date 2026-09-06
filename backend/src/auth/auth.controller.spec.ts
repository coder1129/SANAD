import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { LoginDto, RefreshTokenDto } from './dto';
import { ConfigService } from '@nestjs/config';

describe('AuthController refresh cookie', () => {
  const authService = {
    changePassword: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refreshTokens: vi.fn(),
  };
  const configService = {
    get: vi.fn((key: string) => {
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
      if (key === 'NODE_ENV') return 'production';
      return undefined;
    }),
  };
  const response = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response;

  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController(
      authService as unknown as AuthService,
      configService as unknown as ConfigService,
    );
  });

  it('moves a login refresh token into a hardened cookie', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 1 },
    });

    const result = await controller.login({} as LoginDto, response);

    expect(result).toEqual({ accessToken: 'access-token', user: { id: 1 } });
    expect(response.cookie).toHaveBeenCalledWith(
      'sanad_refresh_token',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/v1/auth',
        sameSite: 'lax',
        secure: true,
      }),
    );
  });

  it('prefers the HttpOnly cookie when rotating a session', async () => {
    authService.refreshTokens.mockResolvedValue({
      accessToken: 'next-access-token',
      refreshToken: 'next-refresh-token',
    });
    const request = {
      headers: {
        cookie: 'other=value; sanad_refresh_token=cookie-refresh-token',
      },
    } as Request;

    const result = await controller.refreshTokens(
      { refreshToken: 'legacy-body-token' } as RefreshTokenDto,
      request,
      response,
    );

    expect(authService.refreshTokens).toHaveBeenCalledWith(
      'cookie-refresh-token',
    );
    expect(result).toEqual({ accessToken: 'next-access-token' });
  });

  it('clears the cookie after logout', async () => {
    authService.logout.mockResolvedValue({ message: 'Logged out' });
    const request = {
      headers: { cookie: 'sanad_refresh_token=refresh-token' },
    } as Request;

    await controller.logout(1, {}, request, response);

    expect(authService.logout).toHaveBeenCalledWith(1, 'refresh-token');
    expect(response.clearCookie).toHaveBeenCalledWith(
      'sanad_refresh_token',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/v1/auth',
        sameSite: 'lax',
        secure: true,
      }),
    );
  });

  it('clears an invalid refresh cookie', async () => {
    authService.refreshTokens.mockRejectedValueOnce(new Error('expired'));
    const request = {
      headers: { cookie: 'sanad_refresh_token=expired-token' },
    } as Request;

    await expect(
      controller.refreshTokens({}, request, response),
    ).rejects.toThrow('expired');

    expect(response.clearCookie).toHaveBeenCalledWith(
      'sanad_refresh_token',
      expect.objectContaining({ path: '/api/v1/auth' }),
    );
  });

  it('clears the refresh cookie after changing a password', async () => {
    authService.changePassword.mockResolvedValue({ message: 'Changed' });

    await controller.changePassword(
      1,
      { currentPassword: 'old', newPassword: 'new' },
      response,
    );

    expect(response.clearCookie).toHaveBeenCalledWith(
      'sanad_refresh_token',
      expect.objectContaining({ path: '/api/v1/auth' }),
    );
  });
});
