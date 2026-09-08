import { useCopy } from '@/lib/i18n/use-copy';
import Link from 'next/link';

import { MobileNavigation } from '@/components/layouts/mobile-navigation';
import { AccountNavigation } from '@/components/auth/account-navigation';
import { BrandLogo } from '@/components/shared/brand-logo';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/layouts/language-switcher';
import { ThemeSwitcher } from '@/components/layouts/theme-switcher';
import {
  PUBLIC_NAVIGATION_LINKS,
  PUBLIC_PRIMARY_ACTION,
} from '@/constants/public-navigation';

const desktopLinkClassName =
  'relative inline-flex min-h-11 items-center rounded-sm px-2 text-sm font-medium text-foreground transition-colors duration-200 after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:origin-center after:scale-x-0 after:bg-accent after:transition-transform after:duration-200 hover:text-primary hover:after:scale-x-100 xl:px-3 xl:after:inset-x-3';

export function PublicNavbar() {
  const _copy = useCopy();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/95 shadow-xs backdrop-blur-md">
      <div className="layout-container flex min-h-20 items-center gap-4 sm:min-h-[5.25rem]">
        <Link
          aria-label={_copy('SANAD home')}
          className="shrink-0 rounded-md"
          href="/"
        >
          <BrandLogo loading="eager" size="sm" />
        </Link>

        <nav
          aria-label={_copy('Primary navigation')}
          className="hidden flex-1 justify-center lg:flex"
        >
          <ul className="flex items-center gap-1 xl:gap-2">
            {PUBLIC_NAVIGATION_LINKS.map((item) => (
              <li key={item.label}>
                <Link className={desktopLinkClassName} href={item.href}>
                  {_copy(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ms-auto hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <AccountNavigation />
          <Button asChild variant="primary">
            <Link href={PUBLIC_PRIMARY_ACTION.href}>
              {_copy(PUBLIC_PRIMARY_ACTION.label)}
            </Link>
          </Button>
        </div>

        <div className="ms-auto flex items-center gap-2 lg:hidden">
          <LanguageSwitcher variant="text" />
          <ThemeSwitcher />
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}
