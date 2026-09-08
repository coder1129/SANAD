import { getLocalizedMetadata } from '@/lib/i18n/metadata';

import { useCopy } from '@/lib/i18n/use-copy';
import type { Metadata } from 'next';
import { OrdersList } from '@/components/account/orders-list';
import { getCopy } from '@/lib/i18n/server-copy';

export async function generateMetadata(): Promise<Metadata> {
  const _copy = await getCopy();
  return await getLocalizedMetadata({
    title: _copy('My Orders | SANAD', 'طلباتي | سند'),
  });
}

export default function MyOrdersPage() {
  const _copy = useCopy();

  return (
    <section className="layout-container py-12 sm:py-16">
      <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
        {_copy('Customer account')}
      </p>
      <h1 className="type-h1 mt-3 text-primary">{_copy('My Orders')}</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        {_copy(
          'Track every service you purchased and continue the conversation with SANAD.',
        )}
      </p>
      <div className="mt-9">
        <OrdersList />
      </div>
    </section>
  );
}
