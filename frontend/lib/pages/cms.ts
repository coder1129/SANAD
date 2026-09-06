import 'server-only';

import { cache } from 'react';

import { isApiError, pagesApi } from '@/lib/api';

export const getPublishedCmsPage = cache(async (slug: string) => {
  try {
    return await pagesApi.getPublished(slug);
  } catch (error) {
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
});
