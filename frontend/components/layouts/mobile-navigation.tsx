'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  PUBLIC_NAVIGATION_LINKS,
  PUBLIC_PRIMARY_ACTION,
  PUBLIC_SIGN_IN_LINK,
} from '@/constants/public-navigation';
import { Button } from '@/components/ui/button';
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
          <Button aria-label="Open navigation menu" size="icon" variant="ghost">
            <Menu aria-hidden="true" className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col p-0" side="right">
          <SheetHeader className="border-b border-border p-5 pr-14">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Explore SANAD services and information.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col p-5">
            <nav aria-label="Mobile navigation">
              <ul className="grid gap-1">
                {PUBLIC_NAVIGATION_LINKS.map((item) => (
                  <li key={item.label}>
                    <SheetClose asChild>
                      <Link
                        className="flex min-h-12 items-center rounded-md px-3 text-base font-medium text-foreground transition-colors duration-200 hover:bg-surface-muted hover:text-primary"
                        href={item.href}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </nav>

            <Separator className="my-5" />

            <div className="mt-auto grid gap-3 pt-3">
              <SheetClose asChild>
                <Button asChild className="w-full" size="lg" variant="outline">
                  <Link href={PUBLIC_SIGN_IN_LINK.href}>
                    {PUBLIC_SIGN_IN_LINK.label}
                  </Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild className="w-full" size="lg" variant="primary">
                  <Link href={PUBLIC_PRIMARY_ACTION.href}>
                    {PUBLIC_PRIMARY_ACTION.label}
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
