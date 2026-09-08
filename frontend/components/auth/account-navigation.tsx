'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { LayoutDashboard, LogOut, PackageCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { useAuthModal } from './auth-modal';

interface AccountNavigationProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export function AccountNavigation({
  mobile = false,
  onNavigate,
}: AccountNavigationProps) {
  const _copy = useCopy();

  const router = useRouter();
  const openAuthModal = useAuthModal();
  const { user, isAdmin, isAuthenticated, isInitializing, logout } = useAuth();

  if (isInitializing) {
    return (
      <div
        aria-hidden="true"
        className="h-11 w-24 animate-pulse bg-surface-muted"
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={mobile ? 'grid w-full gap-2' : 'flex items-center gap-2'}>
        <Button
          className={mobile ? 'w-full' : undefined}
          onClick={() => {
            onNavigate?.();
            openAuthModal(undefined, 'sign-in');
          }}
          size={mobile ? 'lg' : 'md'}
          variant={mobile ? 'outline' : 'ghost'}
        >
          {_copy('Sign In')}
        </Button>
        <Button
          className={mobile ? 'w-full' : undefined}
          onClick={() => {
            onNavigate?.();
            openAuthModal(undefined, 'sign-up');
          }}
          size={mobile ? 'lg' : 'md'}
        >
          {_copy('Sign Up')}
        </Button>
      </div>
    );
  }

  const destination = isAdmin ? '/admin' : '/my-orders';
  if (mobile) {
    return (
      <div className="grid gap-2">
        <Button
          asChild
          className="w-full justify-start"
          size="lg"
          variant="outline"
        >
          <Link href={destination} onClick={onNavigate}>
            {isAdmin ? <LayoutDashboard /> : <PackageCheck />}
            {_copy(isAdmin ? 'Admin Dashboard' : 'My Orders')}
          </Link>
        </Button>
        {!isAdmin ? (
          <Button
            asChild
            className="w-full justify-start"
            size="lg"
            variant="outline"
          >
            <Link href="/profile" onClick={onNavigate}>
              <UserRound />
              {_copy('My Profile')}
            </Link>
          </Button>
        ) : null}
        <Button
          className="w-full justify-start"
          onClick={() => {
            onNavigate?.();
            void logout().finally(() => router.replace('/'));
          }}
          size="lg"
          variant="ghost"
        >
          <LogOut />
          {_copy('Sign Out')}
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          {_copy(user?.firstName ?? user?.name ?? 'Account')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-64 truncate">
          {user?.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={destination}>
            {isAdmin ? <LayoutDashboard /> : <PackageCheck />}
            {_copy(isAdmin ? 'Admin Dashboard' : 'My Orders')}
          </Link>
        </DropdownMenuItem>
        {!isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <UserRound />
              {_copy('My Profile')}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={() => void logout().finally(() => router.replace('/'))}
        >
          <LogOut />
          {_copy('Sign Out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
