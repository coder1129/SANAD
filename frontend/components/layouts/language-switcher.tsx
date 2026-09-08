'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'icon' | 'text' | 'full';
}

/**
 * Switches between Arabic and English by setting the SANAD_LOCALE cookie
 * and reloading the page. This preserves all existing URL structure
 * (no /ar/ or /en/ prefix needed).
 */
export function LanguageSwitcher({
  className,
  variant = 'full',
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const isArabic = locale === 'ar';
  const nextLocale = isArabic ? 'en' : 'ar';
  const label = isArabic ? 'English' : 'عربي';
  const ariaLabel = isArabic ? 'Switch to English' : 'التبديل إلى العربية';

  function handleSwitch() {
    startTransition(() => {
      // Set the locale cookie (1 year expiry)
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `SANAD_LOCALE=${nextLocale}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
      // Reload to apply the new locale from the server
      window.location.reload();
    });
  }

  if (variant === 'icon') {
    return (
      <button
        aria-label={ariaLabel}
        className={cn(
          'inline-flex min-h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-surface-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-55',
          className,
        )}
        disabled={isPending}
        onClick={handleSwitch}
        type="button"
      >
        <Globe aria-hidden="true" className="size-4" />
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        aria-label={ariaLabel}
        className={cn(
          'inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-surface-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-55',
          className,
        )}
        disabled={isPending}
        onClick={handleSwitch}
        type="button"
      >
        {label}
      </button>
    );
  }

  // variant === 'full'
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-surface-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      disabled={isPending}
      onClick={handleSwitch}
      type="button"
    >
      <Globe aria-hidden="true" className="size-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
