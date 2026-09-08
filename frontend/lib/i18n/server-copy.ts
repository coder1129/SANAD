import { getLocale } from 'next-intl/server';
import { createCopy } from './create-copy';

export async function getCopy() {
  const locale = await getLocale();
  return createCopy(locale);
}
