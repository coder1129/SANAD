import { useCopy } from '@/lib/i18n/use-copy';
import { SearchX } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';

export default function PackageNotFound() {
  const _copy = useCopy();

  return (
    <div className="layout-container layout-section">
      <EmptyState
        action={
          <Button asChild>
            <Link href="/packages">{_copy('View All Services')}</Link>
          </Button>
        }
        description={_copy(
          'The service may no longer be available, or the link may be incorrect.',
        )}
        icon={<SearchX />}
        title={_copy('Service not found')}
      />
    </div>
  );
}
