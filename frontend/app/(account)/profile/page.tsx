import { getLocalizedMetadata } from '@/lib/i18n/metadata';

import { useCopy } from '@/lib/i18n/use-copy';
import type { Metadata } from 'next';
import { ProfileForm } from '@/components/account/profile-form';

import { getCopy } from '@/lib/i18n/server-copy';

export async function generateMetadata(): Promise<Metadata> {
  const _copy = await getCopy();
  return await getLocalizedMetadata({
    title: _copy('My Profile | SANAD', 'الملف الشخصي | سند'),
  });
}

export default function ProfilePage() {
  const _copy = useCopy();

  return (
    <div className="bg-surface-muted/40">
      <section className="layout-container py-12 sm:py-16">
        <p className="text-xs font-semibold tracking-[0.16em] text-secondary uppercase">
          {_copy('Customer account')}
        </p>
        <h1 className="type-h1 mt-3 text-primary">{_copy('My Profile')}</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          {_copy(
            'Keep your contact details current so the SANAD team can reach you about your orders.',
          )}
        </p>
        <div className="mt-9">
          <ProfileForm />
        </div>
      </section>
    </div>
  );
}
