'use client';

import { Moon, Sun } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useSyncExternalStore } from 'react';

function subscribe(notify: () => void) {
  window.addEventListener('sanad-theme-change', notify);
  return () => window.removeEventListener('sanad-theme-change', notify);
}

export function ThemeSwitcher() {
  const locale = useLocale();
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme === 'dark',
    () => false,
  );
  const label =
    locale === 'ar'
      ? dark
        ? 'تفعيل الوضع الفاتح'
        : 'تفعيل الوضع الداكن'
      : dark
        ? 'Switch to light mode'
        : 'Switch to dark mode';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-muted"
      onClick={() => {
        const theme = dark ? 'light' : 'dark';
        document.documentElement.dataset.theme = theme;
        document.cookie = `SANAD_THEME=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
        window.dispatchEvent(new Event('sanad-theme-change'));
      }}
    >
      {dark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
