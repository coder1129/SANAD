import type { Metadata } from 'next';
import Link from 'next/link';

import { CmsRichText } from '@/components/pages/cms-rich-text';
import { Separator } from '@/components/ui/separator';
import { getPublishedCmsPage } from '@/lib/pages/cms';

export const dynamic = 'force-dynamic';

const fallbackMetadata: Metadata = {
  title: 'Terms & Conditions | SANAD',
  description:
    'Service terms, revision policies, delivery timelines, and client agreements for SANAD career services.',
  alternates: { canonical: '/pages/terms-and-conditions' },
};

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedCmsPage('terms-and-conditions');
  if (!page) return fallbackMetadata;

  return {
    title: `${page.title_en} | SANAD`,
    description: page.meta_description_en ?? fallbackMetadata.description,
    alternates: fallbackMetadata.alternates,
  };
}

const sections = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    content: [
      'By placing an order or using the SANAD platform you agree to these Terms & Conditions and our Privacy Policy. If you do not agree with any provision, please do not proceed with an order.',
    ],
  },
  {
    id: 'scope-of-services',
    title: 'Scope of Services',
    content: [
      'SANAD provides professional CV writing, LinkedIn profile optimisation, cover-letter development, and related career-document services. Each deliverable is prepared by a qualified career writer according to the package selected at checkout.',
    ],
  },
  {
    id: 'client-responsibilities',
    title: 'Client Responsibilities',
    content: [
      'You confirm that all career history, qualifications, and achievements you provide are accurate and truthful. SANAD does not independently verify credentials. You are responsible for reviewing final drafts before submitting them to employers.',
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery & Timelines',
    content: [
      'Standard delivery is 48–72 business hours from the point we receive all required information. If a complex brief or supplementary consultation is needed, we will notify you of any adjusted timeline before work begins.',
    ],
  },
  {
    id: 'revisions',
    title: 'Revisions',
    content: [
      'We offer unlimited revisions within 14 calendar days of the first draft delivery. Revisions cover tone, wording, emphasis, and structural changes within the scope of the original target role.',
      'Requests that represent a substantial career pivot—targeting an entirely different industry or seniority level—may be treated as a new order or incur an adaptation fee, which will be communicated and agreed upon before any additional work begins.',
    ],
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    content: [
      'Upon full payment and final delivery, you hold complete ownership of the documents produced for you. You are free to use, edit, print, and distribute them for your personal job-search purposes.',
    ],
  },
  {
    id: 'fees-and-refunds',
    title: 'Fees & Refunds',
    content: [
      'All prices are displayed in the listed currency before checkout. Orders may be cancelled for a full refund before a writer has been assigned. Once drafting has commenced, we resolve concerns through our revision process rather than immediate refunds.',
    ],
  },
  {
    id: 'employment-disclaimer',
    title: 'Employment Disclaimer',
    content: [
      'SANAD provides career-document and advisory services. Hiring decisions, interview invitations, and employment offers are made solely by employers. SANAD does not guarantee interviews, job offers, or specific compensation outcomes.',
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    content: [
      'These terms are governed by and construed in accordance with the laws of the United Arab Emirates. Disputes shall be subject to the exclusive jurisdiction of the competent courts in the UAE.',
    ],
  },
] as const;

export default async function TermsAndConditionsPage() {
  const cmsPage = await getPublishedCmsPage('terms-and-conditions');

  return (
    <div className="bg-background">
      <div className="border-b border-border bg-surface-muted">
        <div className="layout-container py-16 sm:py-20">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li>
                <Link className="transition-colors hover:text-primary" href="/">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-border">
                /
              </li>
              <li className="font-medium text-primary">
                Terms &amp; Conditions
              </li>
            </ol>
          </nav>

          <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
            Legal
          </p>
          <h1 className="type-h2 mt-5 max-w-[22ch]">
            {cmsPage?.title_en ?? 'Terms & Conditions'}
          </h1>
          <p className="mt-6 max-w-[42rem] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {cmsPage?.meta_description_en ??
              'The terms that govern the use of SANAD career-document and consulting services.'}
          </p>
          {!cmsPage ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Last updated January 2026
            </p>
          ) : null}
        </div>
      </div>

      <div className="layout-container layout-section">
        <div className="mx-auto max-w-3xl">
          {cmsPage?.content_en ? (
            <CmsRichText content={cmsPage.content_en} />
          ) : (
            <div className="space-y-12">
              {sections.map(({ content, id, title }, index) => (
                <section id={id} key={id}>
                  <h2 className="type-h4 text-primary">
                    {index + 1}. {title}
                  </h2>
                  <div className="mt-4 space-y-4">
                    {content.map((paragraph) => (
                      <p
                        className="text-sm leading-7 text-foreground/80 sm:text-base sm:leading-8"
                        key={paragraph.slice(0, 40)}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  {index < sections.length - 1 && (
                    <Separator className="mt-12" />
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
