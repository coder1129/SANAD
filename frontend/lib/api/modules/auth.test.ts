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
});
