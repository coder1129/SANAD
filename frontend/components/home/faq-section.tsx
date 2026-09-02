import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PUBLIC_SERVICES_HREF } from '@/constants/public-navigation';
import {
  MotionAccentLine,
  MotionHeading,
  MotionReveal,
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
      'SANAD supports professional CV and resume writing, LinkedIn profile optimization, cover letters, and related career documents.',
    link: {
      href: PUBLIC_SERVICES_HREF,
      label: 'View career services',
    },
  },
  {
    question: 'Who are SANAD\u2019s services designed for?',
    answer:
      'The services are designed for professionals at different career stages, with a primary focus on opportunities in the UAE and wider Gulf market.',
  },
  {
    question: 'What information will I need to provide?',
    answer:
      'You will usually provide your current CV or resume, relevant professional details, and the roles or industries you are targeting. Exact requirements depend on the selected service.',
  },
  {
    question: 'Can I choose a service based on my specific career needs?',
    answer:
      'Yes. Each service focuses on a different part of your professional presentation, so you can start with the support that best matches what you need to improve.',
    link: {
      href: PUBLIC_SERVICES_HREF,
      label: 'Compare services',
    },
  },
  {
    question: 'How will I receive my completed documents?',
    answer:
      'Completed files are made available through your SANAD order, where you can access the final deliverables once they are ready.',
  },
  {
    question: 'Does SANAD guarantee interviews or employment?',
    answer:
      'No. SANAD provides professional career-document services, but interviews, job offers, and employment decisions remain with individual employers.',
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
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:gap-16 xl:gap-24">
          <div className="lg:pr-4">
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
              <p className="mt-6 max-w-[34rem] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Answers to the questions visitors most often ask before choosing
                a career service.
              </p>
            </MotionReveal>
          </div>

          <MotionReveal delay={0.1} direction="right" distance={28}>
            <Accordion className="lg:pt-2" collapsible type="single">
              {faqItems.map(({ answer, link, question }, index) => (
                <AccordionItem key={question} value={`faq-${index}`}>
                  <AccordionTrigger>{question}</AccordionTrigger>
                  <AccordionContent>
                    <p>{answer}</p>
                    {link ? (
                      <Link
                        className="group mt-3 inline-flex items-center gap-2 font-semibold text-primary underline decoration-accent underline-offset-4 transition-colors duration-200 hover:text-secondary"
                        href={link.href}
                      >
                        {link.label}
                        <ArrowRight
                          aria-hidden="true"
                          className="size-3.5 transition-transform duration-200 ease-[var(--ease-standard)] motion-safe:group-hover:translate-x-0.5 motion-safe:group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
                        />
                      </Link>
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}
