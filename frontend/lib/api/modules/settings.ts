import { z } from 'zod';
import { ApiError } from '../errors';
import { api, type ApiRequestOptions } from '../request';

const publicSettingsSchema = z.record(z.string(), z.string().nullable());

export type PublicSettings = Record<string, string | null>;

export const settingsKeys = {
  public: ['settings', 'public'] as const,
};

export const settingsApi = {
  async getPublic(
    options: Pick<ApiRequestOptions, 'signal'> = {},
  ): Promise<PublicSettings> {
    const result = publicSettingsSchema.safeParse(
      await api.get<unknown>('/settings/public', {
        ...options,
        authMode: 'none',
      }),
    );
    if (!result.success)
      throw new ApiError({
        kind: 'unknown',
        message: 'Unexpected settings response',
      });
    return result.data;
  },
};
