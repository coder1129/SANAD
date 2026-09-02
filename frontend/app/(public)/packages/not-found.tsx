import { SearchX } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';

export default function PackageNotFound() {
  return (
    <div className="layout-container layout-section">
      <EmptyState
        action={
          <Button asChild>
            <Link href="/packages">View All Services</Link>
          </Button>
        }
        description="The service may no longer be available, or the link may be incorrect."
        icon={<SearchX />}
        title="Service not found"
      />
    </div>
  );
}
