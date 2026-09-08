'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import {
  Activity,
  BadgePercent,
  Boxes,
  ClipboardList,
  CreditCard,
  FileText,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Star,
  Tags,
  Users,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/shared/brand-logo';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils/cn';
import { LanguageSwitcher } from '@/components/layouts/language-switcher';
import { ThemeSwitcher } from '@/components/layouts/theme-switcher';

const navigation = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/packages', label: 'Packages', icon: Boxes },
  { href: '/admin/offers', label: 'Offers', icon: BadgePercent },
  { href: '/admin/coupons', label: 'Coupons', icon: Tags },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/pages', label: 'Pages', icon: FileText },
  { href: '/admin/media', label: 'Media', icon: ImageIcon },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/activity-logs', label: 'Activity Logs', icon: Activity },
  { href: '/admin/administrators', label: 'Administrators', icon: Shield, superOnly: true },
] as const;

function Navigation({ pathname, superAdmin = false }: { pathname: string; superAdmin?: boolean }) {
  const _copy = useCopy();

  return (
    <nav aria-label={_copy('Admin navigation')} className="mt-7 grid gap-1">
      {navigation.filter((item) => !('superOnly' in item) || !item.superOnly || superAdmin).map(({ href, label, icon: Icon }) => {
        const active =
          href === '/admin' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground',
            )}
            href={href}
            key={href}
          >
            <Icon className="size-4" aria-hidden="true" />
            {_copy(label)}
          </Link>
        );
      })}
    </nav>
  );
}

function currentTitle(pathname: string) {
  return (
    navigation.find((item) =>
      item.href === '/admin'
        ? pathname === item.href
        : pathname.startsWith(item.href),
    )?.label ?? 'Administration'
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const _copy = useCopy();

  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const doLogout = () =>
    void logout().finally(() => router.replace('/admin/sign-in'));
  return (
    <div className="min-h-svh bg-surface-muted/45 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden min-h-svh bg-primary px-4 py-6 text-primary-foreground lg:block">
        <div className="rounded-md bg-white p-2">
          <BrandLogo size="sm" />
        </div>
        <Navigation pathname={pathname} superAdmin={user?.role === 'super_admin'} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-4 border-b border-border bg-surface px-4 sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                aria-label={_copy('Open navigation')}
                className="lg:hidden"
                size="icon"
                variant="outline"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              className="bg-primary text-primary-foreground"
              side="left"
            >
              <SheetTitle className="text-primary-foreground">
                {_copy('SANAD Admin')}
              </SheetTitle>
              <Navigation pathname={pathname} superAdmin={user?.role === 'super_admin'} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              {_copy('SANAD Administration')}
            </p>
            <h1 className="truncate font-semibold text-primary">
              {_copy(currentTitle(pathname))}
            </h1>
          </div>
          <div className="hidden text-end sm:block">
            <p className="text-sm font-semibold text-primary">{user?.name}</p>
            <p className="text-xs text-muted-foreground">
              {_copy(user?.role.replace('_', ' '))}
            </p>
          </div>
          <LanguageSwitcher variant="text" />
          <ThemeSwitcher />
          <Button
            aria-label={_copy('Sign out')}
            onClick={doLogout}
            size="icon"
            variant="ghost"
          >
            <LogOut className="size-4" />
          </Button>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{_copy(children)}</main>
      </div>
    </div>
  );
}
