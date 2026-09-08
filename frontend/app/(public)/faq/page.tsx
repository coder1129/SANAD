import { getLocalizedMetadata } from '@/lib/i18n/metadata';

import { useCopy } from '@/lib/i18n/use-copy';
import { ArrowRight, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { FaqSection } from '@/components/home/faq-section';
import { Button } from '@/components/ui/button';
import { PUBLIC_SERVICES_HREF } from '@/constants/public-navigation';

import { getCopy } from '@/lib/i18n/server-copy';

export async function generateMetadata(): Promise<Metadata> {
  const _copy = await getCopy();
  return await getLocalizedMetadata({
    title: _copy(
      'FAQ | SANAD Career Services',
      'الأسئلة الشائعة | سند للخدمات المهنية',
    ),
    description: _copy(
      'Find answers about SANAD career services, delivery, revisions, privacy, and choosing the right package.',
      'إجابات شاملة حول خدمات سند ومدة التسليم وسياسة التعديلات والخصوصية واختيار الباقة المناسبة.',
    ),
    alternates: { canonical: '/faq' },
  });
}

export default function FaqPage() {
  const _copy = useCopy();

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-surface-muted">
        <div className="layout-container py-14 sm:py-18 lg:py-20">
          <nav aria-label={_copy('Breadcrumb')}>
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <li>
                <Link className="transition-colors hover:text-primary" href="/">
                  {_copy('Home')}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-4" />
              </li>
              <li aria-current="page" className="font-semibold text-primary">
                {_copy('FAQ')}
              </li>
            </ol>
          </nav>

          <div className="mt-10 max-w-3xl">
            <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
              <span aria-hidden="true" className="h-px w-8 bg-accent" />
              {_copy('Support')}
            </p>
            <h1 className="type-h1 mt-5 max-w-[18ch] text-primary">
              {_copy('Answers Before You Choose Your Service')}
            </h1>
            <p className="mt-6 max-w-[42rem] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              {_copy(
                'Find clear information about SANAD services, the order process, delivery, revisions, and what to expect from your documents.',
              )}
            </p>
          </div>
        </div>
      </section>

      <FaqSection />

      <section className="border-t border-border bg-surface-muted">
        <div className="layout-container layout-section">
          <div className="mx-auto max-w-2xl text-center">
            <span
              aria-hidden="true"
              className="mx-auto block h-px w-12 bg-accent"
            />
            <h2 className="type-h2 mt-5 text-primary">
              {_copy('Ready to choose your next step?')}
            </h2>
            <p className="mx-auto mt-6 max-w-[38rem] text-base leading-7 text-foreground/75 sm:text-lg sm:leading-8">
              {_copy(
                'Compare the available services and select the support that fits your current career-document needs.',
              )}
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild className="group w-full sm:w-auto" size="lg">
                <Link href={PUBLIC_SERVICES_HREF}>
                  {_copy('View Career Services')}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-200 ease-[var(--ease-standard)] motion-safe:group-hover:translate-x-0.5 motion-safe:group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
                  />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
