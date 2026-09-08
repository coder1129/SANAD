import { getCopy } from '@/lib/i18n/server-copy';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { cn } from '@/lib/utils/cn';

export interface AnnouncementBarProps {
  children?: ReactNode;
  className?: string;
}

export async function AnnouncementBar({
  children,
  className,
}: AnnouncementBarProps) {
  const _copy = await getCopy();

  const t = await getTranslations('announcement');
  const content = children ?? t('default');

  return (
    <aside
      aria-label={_copy('Announcement')}
      className={cn('bg-primary text-primary-foreground', className)}
    >
      <div className="layout-container flex min-h-9 items-center justify-center py-1.5">
        <p className="min-w-0 max-w-full break-words text-center text-xs leading-5 font-medium [overflow-wrap:anywhere] sm:text-sm">
          {_copy(content)}
        </p>
      </div>
    </aside>
  );
}
