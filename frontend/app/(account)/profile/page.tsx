import type { Metadata } from 'next';
import { ProfileForm } from '@/components/account/profile-form';

export const metadata: Metadata = { title: 'My Profile | SANAD' };
export default function ProfilePage() {
  return (
    <div className="bg-surface-muted/40">
      <section className="layout-container py-12 sm:py-16">
        <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
          Customer account
        </p>
        <h1 className="type-h1 mt-3 text-primary">My Profile</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Keep your contact details current so the SANAD team can reach you
          about your orders.
        </p>
        <div className="mt-9">
          <ProfileForm />
        </div>
      </section>
    </div>
  );
}
