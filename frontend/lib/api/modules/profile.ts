import { z } from 'zod';
import type { CareerProfile, User } from '@/types/domain';
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
  career_profile: z
    .object({
      target_job_title: z.string().optional(),
      target_industry: z.string().optional(),
      target_country: z.string().optional(),
      years_of_experience: z.string().optional(),
      education: z.string().optional(),
      key_skills: z.string().optional(),
      career_goals: z.string().optional(),
      linkedin_url: z.string().optional(),
      portfolio_url: z.string().optional(),
    })
    .passthrough()
    .nullish(),
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
  const careerProfile: CareerProfile | null = value.career_profile
    ? {
        targetJobTitle: value.career_profile.target_job_title ?? '',
        targetIndustry: value.career_profile.target_industry ?? '',
        targetCountry: value.career_profile.target_country ?? '',
        yearsOfExperience: value.career_profile.years_of_experience ?? '',
        education: value.career_profile.education ?? '',
        keySkills: value.career_profile.key_skills ?? '',
        careerGoals: value.career_profile.career_goals ?? '',
        linkedinUrl: value.career_profile.linkedin_url ?? '',
        portfolioUrl: value.career_profile.portfolio_url ?? '',
      }
    : null;
  return {
    id: value.id,
    name: value.name,
    email: value.email,
    phone: value.phone ?? null,
    firstName: value.first_name ?? null,
    lastName: value.last_name ?? null,
    gender: value.gender ?? null,
    careerProfile,
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
  careerProfile: CareerProfile;
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
        career_profile: {
          target_job_title: input.careerProfile.targetJobTitle,
          target_industry: input.careerProfile.targetIndustry,
          target_country: input.careerProfile.targetCountry,
          years_of_experience: input.careerProfile.yearsOfExperience,
          education: input.careerProfile.education,
          key_skills: input.careerProfile.keySkills,
          career_goals: input.careerProfile.careerGoals,
          linkedin_url: input.careerProfile.linkedinUrl,
          portfolio_url: input.careerProfile.portfolioUrl,
        },
      }),
    );
  },
};
