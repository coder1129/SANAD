import Link from 'next/link';

import { MobileNavigation } from '@/components/layouts/mobile-navigation';
import { BrandLogo } from '@/components/shared/brand-logo';
import { Button } from '@/components/ui/button';
import {
  PUBLIC_NAVIGATION_LINKS,
  PUBLIC_PRIMARY_ACTION,
  PUBLIC_SIGN_IN_LINK,
} from '@/constants/public-navigation';

const desktopLinkClassName =
  'relative inline-flex min-h-11 items-center rounded-sm px-2 text-sm font-medium text-foreground transition-colors duration-200 after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:origin-center after:scale-x-0 after:bg-accent after:transition-transform after:duration-200 hover:text-primary hover:after:scale-x-100 xl:px-3 xl:after:inset-x-3';

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface shadow-xs">
      <div className="layout-container flex min-h-[5.25rem] items-center gap-4">
        <Link aria-label="SANAD home" className="shrink-0 rounded-md" href="/">
          <BrandLogo loading="eager" size="sm" />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden flex-1 justify-center lg:flex"
        >
          <ul className="flex items-center gap-1 xl:gap-2">
            {PUBLIC_NAVIGATION_LINKS.map((item) => (
              <li key={item.label}>
                <Link className={desktopLinkClassName} href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost">
            <Link href={PUBLIC_SIGN_IN_LINK.href}>
              {PUBLIC_SIGN_IN_LINK.label}
            </Link>
          </Button>
          <Button asChild variant="primary">
            <Link href={PUBLIC_PRIMARY_ACTION.href}>
              {PUBLIC_PRIMARY_ACTION.label}
            </Link>
          </Button>
        </div>

        <div className="ml-auto lg:hidden">
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}
