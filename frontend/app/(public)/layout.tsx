import { useCopy } from '@/lib/i18n/use-copy';
import type { ReactNode } from 'react';

import { PublicLayout } from '@/components/layouts/public-layout';

export default function PublicRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const _copy = useCopy();

  return <PublicLayout>{_copy(children)}</PublicLayout>;
}
