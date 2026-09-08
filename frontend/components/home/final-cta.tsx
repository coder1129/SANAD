import { getCopy } from '@/lib/i18n/server-copy';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { PUBLIC_SERVICES_HREF } from '@/constants/public-navigation';
import {
  MotionAccentLine,
  MotionHeading,
  MotionReveal,
} from '@/components/motion/motion-reveal';

export async function FinalCta() {
  const _copy = await getCopy();

  const t = await getTranslations('home.finalCta');

  return (
    <section
      aria-labelledby="final-cta-heading"
      className="border-t border-border bg-surface-muted"
    >
      <div className="layout-container layout-section">
        <div className="mx-auto max-w-2xl text-center">
          <MotionAccentLine className="mx-auto block h-px w-12 origin-center bg-accent" />
          <MotionHeading
            className="type-h2 mt-5 text-primary"
            id="final-cta-heading"
            text={_copy(t('heading'))}
          />
          <MotionReveal delay={0.14} distance={14}>
            <p className="mx-auto mt-6 max-w-[38rem] text-base leading-7 text-foreground/75 sm:text-lg sm:leading-8">
              {_copy(t('body'))}
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild className="group w-full sm:w-auto" size="lg">
                <Link href={PUBLIC_SERVICES_HREF}>
                  {_copy(t('cta'))}
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
