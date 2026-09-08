import { getLocalizedMetadata } from '@/lib/i18n/metadata';

import { getCopy } from '@/lib/i18n/server-copy';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CmsRichText } from '@/components/pages/cms-rich-text';
import { Separator } from '@/components/ui/separator';
import { getPublishedCmsPage } from '@/lib/pages/cms';

export const dynamic = 'force-dynamic';

const fallbackMetadata: Metadata = {
  title: 'Privacy Policy | SANAD',
  description:
    'How SANAD collects, uses, and protects your personal and professional information.',
  alternates: { canonical: '/pages/privacy-policy' },
};

export async function generateMetadata(): Promise<Metadata> {
  const _copy = await getCopy();
  const page = await getPublishedCmsPage('privacy-policy');
  if (!page) {
    return await getLocalizedMetadata({
      title: _copy('Privacy Policy | SANAD', 'سياسة الخصوصية | سند'),
      description: _copy(
        'How SANAD collects, uses, and protects your personal and professional information.',
        'كيف تقوم منصة سند بجمع واستخدام وحماية معلوماتك الشخصية والمهنية.',
      ),
      alternates: fallbackMetadata.alternates,
    });
  }

  const title = _copy(page.title_en, page.title_ar);
  const description =
    _copy(page.meta_description_en, page.meta_description_ar) ??
    _copy(
      fallbackMetadata.description as string,
      'كيف تقوم منصة سند بجمع واستخدام وحماية معلوماتك الشخصية والمهنية.',
    );

  return await getLocalizedMetadata({
    title: `${title} | ${_copy('SANAD', 'سند')}`,
    description,
    alternates: fallbackMetadata.alternates,
  });
}

const sections = [
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    content: [
      'When you place an order or create an account, we collect your name, email address, phone number, and LinkedIn profile URL. During the service fulfilment process, you provide your existing CV, employment history, target roles, and related career context.',
      'Payment transactions are processed through PCI-DSS compliant gateways. SANAD does not store raw credit card numbers on its servers.',
    ],
  },
  {
    id: 'how-we-use-your-data',
    title: 'How We Use Your Data',
    content: [
      'Your information is used exclusively to deliver the career-document services you have requested: writing and formatting CVs, optimising LinkedIn profiles, developing cover letters, and communicating revision feedback.',
      'We do not use your data for marketing profiling, behavioural targeting, or any purpose beyond the scope of your order.',
    ],
  },
  {
    id: 'confidentiality',
    title: 'Confidentiality',
    content: [
      'All SANAD writers and editors work under binding non-disclosure agreements. Your documents, employer details, and career plans are never shared with recruiters, employers, or any third party without your explicit written consent.',
      'We recognise that many clients are employed professionals exploring opportunities in confidence. Discretion is built into every layer of our process.',
    ],
  },
  {
    id: 'data-security',
    title: 'Data Security',
    content: [
      'Data in transit is protected by TLS 1.3. Access to client files is restricted to the writer and quality reviewer assigned to your specific order. We conduct regular security reviews and maintain access logs for accountability.',
    ],
  },
  {
    id: 'third-party-sharing',
    title: 'Third-Party Sharing',
    content: [
      'We do not sell, rent, or trade your personal information. Data is shared only with infrastructure providers (hosting, payment processing) that are contractually bound to equivalent privacy standards.',
    ],
  },
  {
    id: 'retention-and-deletion',
    title: 'Retention & Deletion',
    content: [
      'Completed documents remain accessible in your order dashboard for your convenience. You may request permanent deletion of your account and all associated files at any time by contacting our support team.',
    ],
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    content: [
      'Under UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection and applicable international privacy frameworks, you have the right to access, correct, and delete your personal data. You may also withdraw consent for non-essential communications at any time.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    content: [
      'For privacy-related questions or data requests, email privacy@sanad.sa.',
    ],
  },
] as const;

export default async function PrivacyPolicyPage() {
  const _copy = await getCopy();

  const cmsPage = await getPublishedCmsPage('privacy-policy');

  return (
    <div className="bg-background">
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
              <li className="font-medium text-primary">
                {_copy('Privacy Policy')}
              </li>
            </ol>
          </nav>

          <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
            {_copy('Legal')}
          </p>
          <h1 className="type-h2 mt-5 max-w-[20ch]">
            {_copy(cmsPage?.title_en ?? 'Privacy Policy')}
          </h1>
          <p className="mt-6 max-w-[42rem] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {_copy(
              cmsPage?.meta_description_en ??
                'How SANAD handles the professional and personal information you share with us during the career-document process.',
            )}
          </p>
          {!cmsPage ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {_copy('Last updated January 2026')}
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
                    {_copy(index + 1)}
                    {_copy('.')}
                    {_copy(title)}
                  </h2>
                  <div className="mt-4 space-y-4">
                    {content.map((paragraph) => (
                      <p
                        className="text-sm leading-7 text-foreground/80 sm:text-base sm:leading-8"
                        key={paragraph.slice(0, 40)}
                      >
                        {_copy(paragraph)}
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
