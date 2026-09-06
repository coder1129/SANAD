import { z } from 'zod';
import type { User } from '@/types/domain';
import { USER_ROLES } from '@/types/domain';
import { ApiError } from '../errors';
import { api, type ApiRequestOptions } from '../request';

const profileSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  gender: z.string().nullish(),
  role: z.enum(USER_ROLES).catch('customer'),
  email_verified: z.boolean().nullish(),
  last_login: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
});

function parse(payload: unknown): User {
  const result = profileSchema.safeParse(payload);
  if (!result.success)
    throw new ApiError({
      kind: 'unknown',
      message: 'Unexpected profile response',
    });
  const value = result.data;
  return {
    id: value.id,
    name: value.name,
    email: value.email,
    phone: value.phone ?? null,
    firstName: value.first_name ?? null,
    lastName: value.last_name ?? null,
    gender: value.gender ?? null,
    role: value.role,
    emailVerified: value.email_verified === true,
    lastLoginAt: value.last_login ?? null,
    createdAt: value.created_at ?? null,
    updatedAt: value.updated_at ?? null,
  };
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  phone: string;
  gender: 'male' | 'female';
}

export const profileApi = {
  async get(options: Pick<ApiRequestOptions, 'signal'> = {}): Promise<User> {
    return parse(await api.get<unknown>('/profile', options));
  },
  async update(input: UpdateProfileInput): Promise<User> {
    return parse(
      await api.patch<unknown>('/profile', {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        gender: input.gender,
      }),
    );
  },
};
