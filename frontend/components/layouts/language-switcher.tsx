'use client';

import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';

import { useLocaleSwitcher } from '@/components/providers/locale-provider';
import { cn } from '@/lib/utils/cn';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'icon' | 'text' | 'full';
}

/** Switches locale in React state without navigating away from the current page. */
export function LanguageSwitcher({
  className,
  variant = 'full',
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const { setLocale } = useLocaleSwitcher();
  const isArabic = locale === 'ar';
  const nextLocale = isArabic ? 'en' : 'ar';
  const label = isArabic ? 'English' : '\u0627\u0644\u0639\u0631\u0628\u064a\u0629';
  const ariaLabel = isArabic
    ? 'Switch to English'
    : '\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u0627\u0644\u0639\u0631\u0628\u064a\u0629';

  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        variant === 'icon'
          ? 'inline-flex min-h-9 min-w-9 items-center justify-center rounded-md px-2'
          : variant === 'text'
            ? 'inline-flex min-h-9 items-center gap-1.5 rounded-md px-2'
            : 'inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5',
        'text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-surface-muted hover:text-primary',
        className,
      )}
      onClick={() => setLocale(nextLocale)}
      type="button"
    >
      {variant !== 'text' && <Globe aria-hidden="true" className="size-4 shrink-0" />}
      {variant !== 'icon' && <span>{label}</span>}
    </button>
  );
}
