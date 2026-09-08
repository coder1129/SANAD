import { useLocale } from 'next-intl';
import { createCopy } from './create-copy';

export function useCopy() {
  const locale = useLocale();
  return createCopy(locale);
}
