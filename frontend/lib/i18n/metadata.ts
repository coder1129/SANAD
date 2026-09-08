import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { translateCopy } from './copy';

export async function getLocalizedMetadata(
  metadata: Metadata,
): Promise<Metadata> {
  const locale = await getLocale();
  if (locale !== 'ar') return metadata;
  function text(value: string) {
    if (value.includes(' | '))
      return value
        .split(' | ')
        .map((part) => translateCopy(part, locale))
        .join(' | ');
    return translateCopy(value, locale);
  }
  function visit(value: unknown, key = ''): unknown {
    if (
      typeof value === 'string' &&
      [
        'title',
        'description',
        'alt',
        'default',
        'absolute',
        'template',
      ].includes(key)
    )
      return text(value);
    if (Array.isArray(value)) return value.map((item) => visit(item, key));
    if (value && typeof value === 'object' && !(value instanceof URL))
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, visit(v, k)]),
      );
    return value;
  }
  return visit(metadata) as Metadata;
}
