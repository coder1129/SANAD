import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('../request', () => ({
  api: { get: vi.fn(), post: mocks.post },
}));

import { authApi } from './auth';

describe('authApi cookie session contract', () => {
  beforeEach(() => mocks.post.mockReset());

  it('refreshes without exposing a refresh token in the request or response', async () => {
    mocks.post.mockResolvedValue({ accessToken: 'new-access-token' });

    await expect(authApi.refresh()).resolves.toEqual({
      accessToken: 'new-access-token',
    });
    expect(mocks.post).toHaveBeenCalledWith(
      '/auth/refresh',
      {},
      {
        authMode: 'none',
      },
    );
  });

  it('accepts login responses that contain only a browser-visible access token', async () => {
    mocks.post.mockResolvedValue({
      accessToken: 'access-token',
      user: {
        id: 1,
        name: 'User',
        email: 'user@example.com',
        role: 'customer',
      },
    });

    await expect(
      authApi.login({
        email: 'user@example.com',
        password: 'not-a-real-secret',
      }),
    ).resolves.toMatchObject({ accessToken: 'access-token' });
  });

  it('sends an explicit flow for passwordless sign-in and sign-up', async () => {
    mocks.post.mockResolvedValue({
      message: 'sent',
      email: 'us***@example.com',
    });

    await authApi.requestPasswordlessOtp('user@example.com', 'sign_up');

    expect(mocks.post).toHaveBeenCalledWith(
      '/auth/passwordless/request',
      { email: 'user@example.com', flow: 'sign_up' },
      { authMode: 'none' },
    );
  });

  it('maps an authenticated Google response into the session contract', async () => {
    mocks.post.mockResolvedValue({
      status: 'authenticated',
      accessToken: 'google-access-token',
      user: {
        id: 7,
        name: 'Google User',
        email: 'google@example.com',
        role: 'customer',
      },
    });

    await expect(
      authApi.authenticateWithGoogle('google-id-token', 'sign_in'),
    ).resolves.toMatchObject({
      status: 'authenticated',
      user: { id: 7 },
      tokens: { accessToken: 'google-access-token' },
    });
  });
});
