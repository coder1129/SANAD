import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { PUBLIC_SERVICES_HREF } from '@/constants/public-navigation';
import {
  MotionAccentLine,
  MotionHeading,
  MotionReveal,
  MotionStaggerItem,
  MotionStaggerList,
} from '@/components/motion/motion-reveal';

interface FaqItem {
  answer: string;
  link?: {
    href: string;
    label: string;
  };
  question: string;
}

const faqItems: readonly FaqItem[] = [
  {
    question: 'What career services does SANAD offer?',
    answer:
      'SANAD supports professional CV and resume writing, LinkedIn profile optimization, cover letters, job application preparation, and bundled career-document packages designed for a coordinated professional presentation.',
    link: {
      href: PUBLIC_SERVICES_HREF,
      label: 'View career services',
    },
  },
  {
    question: 'Who are SANAD\u2019s services designed for?',
    answer:
      'The services are designed for professionals at different career stages — from those entering the workforce to experienced mid-career and senior professionals — with a primary focus on opportunities in the UAE and wider Gulf market.',
  },
  {
    question: 'How do I get started?',
    answer:
      'Browse the available services, select the one that fits your current needs, and place your order. Once confirmed, SANAD will reach out to collect the information required to begin your service.',
    link: {
      href: PUBLIC_SERVICES_HREF,
      label: 'Browse services',
    },
  },
  {
    question: 'What information will I need to provide?',
    answer:
      'You will usually need to share your current CV or employment history, the roles and industries you are targeting, key achievements and qualifications, and — where relevant — your LinkedIn profile link. Exact requirements are confirmed when your order begins.',
  },
  {
    question: 'Can I choose a service based on my specific career needs?',
    answer:
      'Yes. Each service focuses on a different part of your professional presentation. You can start with a standalone CV, add a cover letter, include LinkedIn optimization, or select a bundled package that covers multiple deliverables at once.',
    link: {
      href: PUBLIC_SERVICES_HREF,
      label: 'Compare services',
    },
  },
  {
    question: 'How long does it take to receive my completed documents?',
    answer:
      'Turnaround time depends on the selected service and the information provided. SANAD confirms the expected delivery timeline when your order is reviewed. Providing complete and accurate information at the start helps avoid delays.',
  },
  {
    question: 'How will I receive my completed documents?',
    answer:
      'Completed files are made available through your SANAD order. You will be notified when the final deliverables are ready to access and download.',
  },
  {
    question: 'How do revisions work?',
    answer:
      'Each service includes a set number of revision rounds. Revisions cover refinements within the agreed scope of the service — they are not open-ended rewrites. You review the completed work first, then request adjustments within the included allowance.',
  },
  {
    question: 'Are the services focused on the UAE and Gulf job market?',
    answer:
      'Yes. SANAD\u2019s services are shaped with the UAE and broader Gulf market in mind, including the expectations of regional employers, industry norms, and the way professional documents are evaluated in this context.',
  },
  {
    question: 'Can SANAD help with documents in both Arabic and English?',
    answer:
      'Service language and document format are confirmed at the time of ordering. If you have a specific language requirement, mention it when you place your order so SANAD can confirm what is available for your chosen service.',
  },
  {
    question: 'Is my personal and career information kept private?',
    answer:
      'Yes. The information you provide is used solely to deliver your service. SANAD does not share, sell, or use your personal career details for any purpose outside of your order.',
  },
  {
    question: 'Will SANAD need access to my LinkedIn account?',
    answer:
      'The LinkedIn optimization service delivers refined content for you to apply yourself. If any direct profile access is required, this must be confirmed and arranged separately with SANAD before work begins. Never share account passwords through an enquiry message.',
  },
  {
    question: 'What can I do with the documents after I receive them?',
    answer:
      'The completed documents are yours to use for job applications, professional networking, and career development. They are tailored to your background and target direction at the time of the service.',
  },
  {
    question: 'Does SANAD guarantee interviews or employment?',
    answer:
      'No. SANAD provides professional career-document services that improve the clarity and quality of your professional presentation. Interviews, job offers, and employment decisions remain with individual employers and cannot be guaranteed.',
  },
  {
    question: 'How do I contact SANAD if I have a question about my order?',
    answer:
      'You can reach SANAD through the contact details provided in your order confirmation. For general enquiries before placing an order, use the contact option available on the services page.',
    link: {
      href: PUBLIC_SERVICES_HREF,
      label: 'View services and contact options',
    },
  },
];

export function FaqSection() {
  return (
    <section
      aria-labelledby="faq-heading"
      className="scroll-mt-24 border-b border-border bg-background"
      id="faq"
    >
      <div className="layout-container layout-section">
        <div className="mb-12 max-w-3xl lg:mb-16">
          <MotionReveal direction="none">
            <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
              <MotionAccentLine className="h-px w-8 origin-left bg-accent" />
              FAQ
            </p>
          </MotionReveal>
          <MotionHeading
            className="type-h2 mt-5 max-w-[14ch]"
            id="faq-heading"
            text="Common Questions"
          />
          <MotionReveal delay={0.12} distance={14}>
            <p className="mt-6 max-w-[42rem] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Answers to the questions visitors most often ask before choosing
              a career service.
            </p>
          </MotionReveal>
        </div>

        <MotionStaggerList className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {faqItems.map(({ answer, link, question }) => (
            <MotionStaggerItem key={question}>
              <div className="border-t-2 border-accent pt-5">
                <h3 className="type-h5 text-primary">{question}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {answer}
                </p>
                {link ? (
                  <Link
                    className="group mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary underline decoration-accent underline-offset-4 transition-colors duration-200 hover:text-secondary"
                    href={link.href}
                  >
                    {link.label}
                    <ArrowRight
                      aria-hidden="true"
                      className="size-3.5 transition-transform duration-200 ease-[var(--ease-standard)] motion-safe:group-hover:translate-x-0.5 motion-safe:group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </Link>
                ) : null}
              </div>
            </MotionStaggerItem>
          ))}
        </MotionStaggerList>
      </div>
    </section>
  );
}
