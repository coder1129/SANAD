import { z } from 'zod';

import { ApiError } from '../errors';
import { api, type ApiRequestOptions } from '../request';

const publicPageSchema = z.object({
  id: z.number().int().positive(),
  title_en: z.string(),
  slug: z.string(),
  content_en: z.string().nullable(),
  meta_description_en: z.string().nullable(),
  is_active: z.boolean().nullable(),
  updated_at: z.string().nullable(),
});

export type PublicCmsPage = z.infer<typeof publicPageSchema>;

export const pagesApi = {
  async getPublished(
    slug: string,
    options: Pick<ApiRequestOptions, 'signal'> = {},
  ): Promise<PublicCmsPage> {
    const result = publicPageSchema.safeParse(
      await api.get<unknown>(`/pages/${encodeURIComponent(slug)}`, {
        ...options,
        authMode: 'none',
      }),
    );

    if (!result.success) {
      throw new ApiError({
        kind: 'unknown',
        message: 'Unexpected public page response',
      });
    }

    return result.data;
  },
};
