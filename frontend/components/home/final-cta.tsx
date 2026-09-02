import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { PUBLIC_SERVICES_HREF } from '@/constants/public-navigation';
import {
  MotionAccentLine,
  MotionHeading,
  MotionReveal,
} from '@/components/motion/motion-reveal';

export function FinalCta() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="relative isolate overflow-hidden bg-surface-muted"
    >
      <div
        aria-hidden="true"
        className="sanad-cta-glow absolute -right-20 -bottom-56 size-[30rem] rounded-full bg-accent/10 blur-3xl"
      />
      <div className="layout-container layout-section relative">
        <div className="mx-auto max-w-2xl text-center">
          <MotionAccentLine className="mx-auto block h-px w-12 origin-center bg-accent" />
          <MotionHeading
            className="type-h2 mt-5 text-primary"
            id="final-cta-heading"
            text="Ready to present your experience with greater clarity?"
          />
          <MotionReveal delay={0.14} distance={14}>
            <p className="mx-auto mt-6 max-w-[38rem] text-base leading-7 text-foreground/75 sm:text-lg sm:leading-8">
              Review SANAD&rsquo;s career services and choose the support that
              fits your next professional move.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild className="group w-full sm:w-auto" size="lg">
                <Link href={PUBLIC_SERVICES_HREF}>
                  Find the Right Service
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-200 ease-[var(--ease-standard)] motion-safe:group-hover:translate-x-0.5 motion-safe:group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
                  />
                </Link>
              </Button>
            </div>
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}
