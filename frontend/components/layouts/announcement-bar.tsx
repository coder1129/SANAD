import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export interface AnnouncementBarProps {
  children?: ReactNode;
  className?: string;
}

export function AnnouncementBar({
  children = 'Professional Career Services for the UAE Market',
  className,
}: AnnouncementBarProps) {
  return (
    <aside
      aria-label="Announcement"
      className={cn('bg-primary text-primary-foreground', className)}
    >
      <div className="layout-container flex min-h-9 items-center justify-center py-1.5">
        <p className="min-w-0 max-w-full break-words text-center text-xs leading-5 font-medium [overflow-wrap:anywhere] sm:text-sm">
          {children}
        </p>
      </div>
    </aside>
  );
}
