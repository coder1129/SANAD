import arabic from '@/messages/interface-ar.json';

const dictionary: Record<string, string> = Object.assign(
  Object.create(null),
  arabic,
);
const templates = Object.entries(dictionary)
  .filter(([key]) => /\{\d+\}/.test(key))
  .map(([key, translation]) => {
    const indices = [...key.matchAll(/\{(\d+)\}/g)].map((match) =>
      Number(match[1]),
    );
    const pattern = key
      .split(/\{\d+\}/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('(.*?)');
    return { expression: new RegExp(`^${pattern}$`), indices, translation };
  });

/** Translate interface copy only; preserve React elements, IDs and user data. */
export function translateCopy<T>(
  value: T,
  locale: string,
  arabicValue?: T | null,
): T {
  if (locale !== 'ar') return value;
  if (typeof arabicValue === 'string' && arabicValue.trim()) return arabicValue;
  if (typeof value !== 'string') return value;
  const normalized = value.replace(/\s+/g, ' ').trim();
  const translated = dictionary[normalized];
  if (translated !== undefined) return translated as T;
  for (const template of templates) {
    const match = template.expression.exec(normalized);
    if (match) {
      return template.translation.replace(/\{(\d+)\}/g, (_, index) => {
        const text = match[template.indices.indexOf(Number(index)) + 1];
        return dictionary[text] ?? text;
      }) as T;
    }
  }
  return value;
}
