import type { Metadata } from 'next';
import { AdminSignInForm } from '@/components/admin/admin-sign-in-form';
import { BrandLogo } from '@/components/shared/brand-logo';
export const metadata: Metadata = {
  title: 'Administrator Sign In | SANAD',
  robots: { index: false, follow: false },
};
export default function AdminSignInPage() {
  return (
    <main className="grid min-h-svh bg-surface-muted lg:grid-cols-[minmax(0,0.85fr)_minmax(28rem,1.15fr)]">
      <section className="hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="w-fit rounded-md bg-white p-2">
          <BrandLogo size="md" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
            Private administration
          </p>
          <h1 className="type-h1 mt-5 max-w-xl">
            Career services operations, clearly managed.
          </h1>
          <p className="mt-5 max-w-lg text-primary-foreground/70">
            Review orders, customers, payments, content, and settings from one
            secure workspace.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">
          Authorized SANAD staff only
        </p>
      </section>
      <section className="grid place-items-center p-6 sm:p-10">
        <div className="w-full max-w-md border border-border bg-surface p-7 shadow-sm sm:p-9">
          <div className="lg:hidden">
            <BrandLogo size="sm" />
          </div>
          <p className="mt-7 text-xs font-semibold tracking-[0.16em] text-secondary uppercase lg:mt-0">
            Administrator access
          </p>
          <h2 className="type-h2 mt-3 text-primary">Welcome back</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Use the administrator email and password assigned to your account.
          </p>
          <AdminSignInForm />
        </div>
      </section>
    </main>
  );
}
