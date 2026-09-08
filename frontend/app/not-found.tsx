import { useCopy } from '@/lib/i18n/use-copy';
import Link from 'next/link';
import { Compass } from 'lucide-react';
import { BrandLogo } from '@/components/shared/brand-logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const _copy = useCopy();

  return (
    <main className="grid min-h-svh place-items-center bg-surface-muted p-6">
      <section className="w-full max-w-2xl border border-border bg-surface p-8 text-center shadow-sm sm:p-12">
        <BrandLogo className="mx-auto" size="sm" />
        <Compass
          aria-hidden="true"
          className="mx-auto mt-9 size-10 text-accent"
        />
        <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-secondary uppercase">
          {_copy('404')}
        </p>
        <h1 className="type-h1 mt-3 text-primary">{_copy('Page not found')}</h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          {_copy('The page may have moved or the address may be incorrect.')}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">{_copy('Back to Home')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/packages">{_copy('Explore Services')}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
