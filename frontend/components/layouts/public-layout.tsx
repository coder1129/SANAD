import type { ReactNode } from 'react';

import { AnnouncementBar } from '@/components/layouts/announcement-bar';
import { PublicFooter } from '@/components/layouts/public-footer';
import { PublicNavbar } from '@/components/layouts/public-navbar';
import { WhatsAppFloatingButton } from '@/components/shared/whatsapp-floating-button';

export interface PublicLayoutProps {
  announcement?: ReactNode;
  children: ReactNode;
}

export function PublicLayout({ announcement, children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a
        className="sr-only z-[60] rounded-md bg-surface px-4 py-3 font-semibold text-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        href="#main-content"
      >
        Skip to main content
      </a>
      <AnnouncementBar>{announcement}</AnnouncementBar>
      <PublicNavbar />
      <main className="min-w-0 flex-1" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <PublicFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
