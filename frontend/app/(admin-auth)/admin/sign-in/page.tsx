import { getLocalizedMetadata } from '@/lib/i18n/metadata';

import { useCopy } from '@/lib/i18n/use-copy';
import type { Metadata } from 'next';
import { AdminSignInForm } from '@/components/admin/admin-sign-in-form';
import { BrandLogo } from '@/components/shared/brand-logo';
import { LanguageSwitcher } from '@/components/layouts/language-switcher';
import { ThemeSwitcher } from '@/components/layouts/theme-switcher';
import { getCopy } from '@/lib/i18n/server-copy';

export async function generateMetadata(): Promise<Metadata> {
  const _copy = await getCopy();
  return await getLocalizedMetadata({
    title: _copy('Administrator Sign In | SANAD', 'تسجيل دخول الإدارة | سند'),
    robots: { index: false, follow: false },
  });
}
export default function AdminSignInPage() {
  const _copy = useCopy();

  return (
    <main className="grid min-h-svh bg-surface-muted lg:grid-cols-[minmax(0,0.85fr)_minmax(28rem,1.15fr)]">
      <section className="hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="w-fit rounded-md bg-white p-2">
          <BrandLogo size="md" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
            {_copy('Private administration')}
          </p>
          <h1 className="type-h1 mt-5 max-w-xl">
            {_copy('Career services operations, clearly managed.')}
          </h1>
          <p className="mt-5 max-w-lg text-primary-foreground/70">
            {_copy(
              'Review orders, customers, payments, content, and settings from one secure workspace.',
            )}
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">
          {_copy('Authorized SANAD staff only')}
        </p>
      </section>
      <section className="grid place-items-center p-6 sm:p-10">
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
        <div className="w-full max-w-md border border-border bg-surface p-7 shadow-sm sm:p-9">
          <div className="lg:hidden">
            <BrandLogo size="sm" />
          </div>
          <p className="mt-7 text-xs font-semibold tracking-[0.16em] text-secondary uppercase lg:mt-0">
            {_copy('Administrator access')}
          </p>
          <h2 className="type-h2 mt-3 text-primary">{_copy('Welcome back')}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {_copy(
              'Use the administrator email and password assigned to your account.',
            )}
          </p>
          <AdminSignInForm />
        </div>
      </section>
    </main>
  );
}
