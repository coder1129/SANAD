import 'server-only';

import { cache } from 'react';
import { getLocale } from 'next-intl/server';

import { isApiError, pagesApi } from '@/lib/api';

export const getPublishedCmsPage = cache(async (slug: string) => {
  try {
    const page = await pagesApi.getPublished(slug);
    if ((await getLocale()) !== 'ar') return page;
    return {
      ...page,
      title_en: page.title_ar?.trim() || page.title_en,
      content_en: page.content_ar?.trim() || page.content_en,
      meta_description_en:
        page.meta_description_ar?.trim() || page.meta_description_en,
    };
  } catch (error) {
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
});
