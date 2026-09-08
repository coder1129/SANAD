import { getLocalizedMetadata } from '@/lib/i18n/metadata';

import { getCopy } from '@/lib/i18n/server-copy';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CmsRichText } from '@/components/pages/cms-rich-text';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PUBLIC_SERVICES_HREF } from '@/constants/public-navigation';
import { getPublishedCmsPage } from '@/lib/pages/cms';

export const dynamic = 'force-dynamic';

const fallbackMetadata: Metadata = {
  title: 'About Us | SANAD',
  description:
    'SANAD helps professionals present their experience with clarity across CVs, LinkedIn profiles, and career documents for the UAE and Gulf market.',
  alternates: { canonical: '/pages/about-us' },
};

export async function generateMetadata(): Promise<Metadata> {
  const _copy = await getCopy();
  const page = await getPublishedCmsPage('about-us');
  if (!page) {
    return await getLocalizedMetadata({
      title: _copy('About Us | SANAD', 'من نحن | سند'),
      description: _copy(
        'SANAD helps professionals present their experience with clarity across CVs, LinkedIn profiles, and career documents for the UAE and Gulf market.',
        'سند تساعد المهنيين على إبراز خبراتهم بوضوح واحترافية في السير الذاتية وملفات لينكدإن والمستندات المهنية لسوق العمل.',
      ),
      alternates: fallbackMetadata.alternates,
    });
  }

  const title = _copy(page.title_en, page.title_ar);
  const description =
    _copy(page.meta_description_en, page.meta_description_ar) ??
    _copy(
      fallbackMetadata.description as string,
      'سند تساعد المهنيين على إبراز خبراتهم بوضوح واحترافية في السير الذاتية وملفات لينكدإن والمستندات المهنية لسوق العمل.',
    );

  return await getLocalizedMetadata({
    title: `${title} | ${_copy('SANAD', 'سند')}`,
    description,
    alternates: fallbackMetadata.alternates,
  });
}

const principles = [
  {
    number: '01',
    title: 'Substance Before Decoration',
    description:
      'Content strategy comes first. Formatting supports the message instead of competing with it.',
  },
  {
    number: '02',
    title: 'Regional Context',
    description:
      'Language and structure reflect the expectations of recruiters and hiring committees operating in the UAE and wider Gulf market.',
  },
  {
    number: '03',
    title: 'Screening Awareness',
    description:
      'Documents are built with ATS compliance in mind so your profile reaches a human reviewer rather than being filtered out.',
  },
  {
    number: '04',
    title: 'Confidentiality by Default',
    description:
      'Every engagement operates under strict non-disclosure. Your documents and career plans stay between you and your assigned writer.',
  },
] as const;

export default async function AboutUsPage() {
  const _copy = await getCopy();

  const cmsPage = await getPublishedCmsPage('about-us');

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface-muted">
        <div className="layout-container py-16 sm:py-20">
          <nav aria-label={_copy('Breadcrumb')} className="mb-8">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li>
                <Link className="transition-colors hover:text-primary" href="/">
                  {_copy('Home')}
                </Link>
              </li>
              <li aria-hidden="true" className="text-border">
                {_copy('/')}
              </li>
              <li className="font-medium text-primary">{_copy('About Us')}</li>
            </ol>
          </nav>

          <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
            {_copy('Company')}
          </p>
          <h1 className="type-h2 mt-5 max-w-[20ch]">
            {_copy(cmsPage?.title_en ?? 'Career Documents, Refined')}
          </h1>
          <p className="mt-6 max-w-[42rem] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {_copy(
              cmsPage?.meta_description_en ??
                'SANAD helps professionals present their experience with clarity across a CV, LinkedIn profile, and supporting career documents shaped for the UAE and Gulf job market.',
            )}
          </p>
        </div>
      </div>

      {/* Narrative */}
      <div className="layout-container layout-section">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] lg:items-start lg:gap-20">
          <div className="space-y-6 text-sm leading-7 text-foreground/80 sm:text-base sm:leading-8">
            {cmsPage?.content_en ? (
              <CmsRichText content={cmsPage.content_en} />
            ) : (
              <>
                <h2 className="type-h4 text-primary">{_copy('What we do')}</h2>
                <p>
                  {_copy(
                    'We write and optimise professional CVs, LinkedIn profiles, cover letters, and related career documents. Each piece of work is handled by a writer with direct experience in Gulf-market hiring standards and ATS screening requirements.',
                  )}
                </p>
                <p>
                  {_copy(
                    'The process is straightforward: choose a service, share your career context, and receive polished deliverables within 48–72 business hours. Unlimited revisions are included within 14 days of the first draft so the final result reflects your voice and goals accurately.',
                  )}
                </p>
              </>
            )}
          </div>

          <div className="rounded-lg border border-border bg-surface-muted p-7 shadow-xs sm:p-8">
            <h3 className="type-h4 text-primary">{_copy('Quick facts')}</h3>
            <dl className="mt-6 space-y-5 text-sm">
              <div>
                <dt className="font-semibold text-primary">{_copy('Focus')}</dt>
                <dd className="mt-1 text-muted-foreground">
                  {_copy('CV, LinkedIn, and career-document services')}
                </dd>
              </div>
              <Separator />
              <div>
                <dt className="font-semibold text-primary">
                  {_copy('Market')}
                </dt>
                <dd className="mt-1 text-muted-foreground">
                  {_copy('UAE, Saudi Arabia, and the wider GCC')}
                </dd>
              </div>
              <Separator />
              <div>
                <dt className="font-semibold text-primary">
                  {_copy('Turnaround')}
                </dt>
                <dd className="mt-1 text-muted-foreground">
                  {_copy('48–72 business hours, standard delivery')}
                </dd>
              </div>
              <Separator />
              <div>
                <dt className="font-semibold text-primary">
                  {_copy('Revisions')}
                </dt>
                <dd className="mt-1 text-muted-foreground">
                  {_copy('Unlimited within 14 days of first draft')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Principles */}
      <div className="border-t border-border bg-surface-muted">
        <div className="layout-container layout-section">
          <div className="max-w-2xl">
            <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
              <span aria-hidden="true" className="h-px w-8 bg-accent" />
              {_copy('Our approach')}
            </p>
            <h2 className="type-h2 mt-5 max-w-[18ch]">
              {_copy('Principles That Shape Every Document')}
            </h2>
          </div>

          <ol className="mt-12 border-y border-border">
            {principles.map(({ description, number, title }) => (
              <li
                className="grid gap-4 border-b border-border py-7 last:border-b-0 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-6"
                key={number}
              >
                <span
                  aria-hidden="true"
                  className="font-display text-2xl leading-none text-accent sm:pt-0.5 sm:text-3xl"
                >
                  {_copy(number)}
                </span>
                <div>
                  <h3 className="type-h4 text-primary">{_copy(title)}</h3>
                  <p className="mt-2 max-w-[42rem] text-sm leading-6 text-foreground/75 sm:text-base sm:leading-7">
                    {_copy(description)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-border">
        <div className="layout-container layout-section">
          <div className="mx-auto max-w-2xl text-center">
            <span
              aria-hidden="true"
              className="mx-auto block h-px w-12 bg-accent"
            />
            <h2 className="type-h2 mt-5 text-primary">
              {_copy('Ready to get started?')}
            </h2>
            <p className="mx-auto mt-6 max-w-[38rem] text-base leading-7 text-foreground/75 sm:text-lg sm:leading-8">
              {_copy(
                'Review the available services and choose the support that fits your next career move.',
              )}
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild className="group" size="lg">
                <Link href={PUBLIC_SERVICES_HREF}>
                  {_copy('View Career Services')}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-200 ease-[var(--ease-standard)] motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
