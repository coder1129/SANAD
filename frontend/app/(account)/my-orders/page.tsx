import type { Metadata } from 'next';
import { OrdersList } from '@/components/account/orders-list';
export const metadata: Metadata = { title: 'My Orders | SANAD' };
export default function MyOrdersPage() {
  return (
    <section className="layout-container py-12 sm:py-16">
      <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
        Customer account
      </p>
      <h1 className="type-h1 mt-3 text-primary">My Orders</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Track every service you purchased and continue the conversation with
        SANAD.
      </p>
      <div className="mt-9">
        <OrdersList />
      </div>
    </section>
  );
}
