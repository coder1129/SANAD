import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export default getRequestConfig(async () => {
  // Read locale from cookie first, then Accept-Language header, then default to 'en'
  const cookieStore = await cookies();
  const headersList = await headers();

  const cookieLocale = cookieStore.get('SANAD_LOCALE')?.value;
  const acceptLanguage = headersList.get('accept-language') ?? '';

  let locale: 'en' | 'ar' = 'en';

  if (cookieLocale === 'ar' || cookieLocale === 'en') {
    locale = cookieLocale;
  } else if (acceptLanguage.startsWith('ar')) {
    locale = 'ar';
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
