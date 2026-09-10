'use client';

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';

export type AppLocale = 'ar' | 'en';

interface LocaleContextValue {
  setLocale: (locale: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale: AppLocale;
  messagesByLocale: Record<AppLocale, AbstractIntlMessages>;
}

/** Keeps locale in React state; the cookie only restores it on a later visit. */
export function LocaleProvider({
  children,
  initialLocale,
  messagesByLocale,
}: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = useCallback(
    (nextLocale: AppLocale) => {
      if (nextLocale === locale) return;

      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `SANAD_LOCALE=${nextLocale}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;

      startTransition(() => setLocaleState(nextLocale));
    },
    [locale],
  );

  const value = useMemo(() => ({ setLocale }), [setLocale]);

  return (
    <LocaleContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocaleSwitcher() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocaleSwitcher must be used inside LocaleProvider');
  return context;
}
