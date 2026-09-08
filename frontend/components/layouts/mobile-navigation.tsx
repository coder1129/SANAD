'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  PUBLIC_NAVIGATION_LINKS,
  PUBLIC_PRIMARY_ACTION,
} from '@/constants/public-navigation';
import { Button } from '@/components/ui/button';
import { AccountNavigation } from '@/components/auth/account-navigation';
import { LanguageSwitcher } from '@/components/layouts/language-switcher';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function MobileNavigation() {
  const _copy = useCopy();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktopMedia = window.matchMedia('(min-width: 64rem)');
    const closeOnDesktop = () => {
      if (desktopMedia.matches) {
        setOpen(false);
      }
    };

    closeOnDesktop();
    desktopMedia.addEventListener('change', closeOnDesktop);

    return () => desktopMedia.removeEventListener('change', closeOnDesktop);
  }, []);

  return (
    <div className="lg:hidden">
      <Sheet onOpenChange={setOpen} open={open}>
        <SheetTrigger asChild>
          <Button
            aria-label={_copy('Open navigation menu')}
            size="icon"
            variant="ghost"
          >
            <Menu aria-hidden="true" className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col p-0" side="right">
          <SheetHeader className="border-b border-border p-5 pe-14">
            <SheetTitle>{_copy('Menu')}</SheetTitle>
            <SheetDescription>
              {_copy('Explore SANAD services and information.')}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col p-5">
            <nav aria-label={_copy('Mobile navigation')}>
              <ul className="grid gap-1">
                {PUBLIC_NAVIGATION_LINKS.map((item) => (
                  <li key={item.label}>
                    <SheetClose asChild>
                      <Link
                        className="flex min-h-12 items-center rounded-md px-3 text-base font-medium text-foreground transition-colors duration-200 hover:bg-surface-muted hover:text-primary"
                        href={item.href}
                      >
                        {_copy(item.label)}
                      </Link>
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </nav>

            <Separator className="my-5" />

            <div className="mt-auto grid gap-3 pt-3">
              <LanguageSwitcher
                className="w-full justify-start"
                variant="full"
              />
              <Separator />
              <AccountNavigation mobile onNavigate={() => setOpen(false)} />
              <SheetClose asChild>
                <Button asChild className="w-full" size="lg" variant="primary">
                  <Link href={PUBLIC_PRIMARY_ACTION.href}>
                    {_copy(PUBLIC_PRIMARY_ACTION.label)}
                  </Link>
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
