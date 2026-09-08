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

export async function PremiumCta() {
  const _copy = await getCopy();

  const t = await getTranslations('home.premiumCta');

  return (
    <section
      aria-labelledby="premium-cta-heading"
      className="relative isolate overflow-hidden border-y border-primary-foreground/10 bg-primary text-primary-foreground"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-primary-foreground/15"
      />

      <div className="layout-container relative py-14 sm:py-16 lg:py-20">
        <div className="grid gap-9 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-end lg:gap-16 xl:gap-24">
          <div>
            <MotionReveal direction="none">
              <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-[color:var(--sanad-champagne)] uppercase sm:text-sm">
                <MotionAccentLine className="h-px w-8 origin-left bg-[color:var(--sanad-champagne)]" />
                {_copy(t('eyebrow'))}
              </p>
            </MotionReveal>
            <MotionHeading
              className="type-h2 mt-5 max-w-[19ch] text-primary-foreground"
              id="premium-cta-heading"
              text={_copy(t('heading'))}
            />
          </div>

          <MotionReveal
            className="border-t border-primary-foreground/20 pt-7 lg:border-t-0 lg:border-s lg:pt-0 lg:ps-12"
            delay={0.14}
            direction="right"
          >
            <p className="max-w-[34rem] text-base leading-7 text-primary-foreground/80 sm:text-lg sm:leading-8">
              {_copy(t('body'))}
            </p>
            <div className="mt-7">
              <Button
                asChild
                className="group border-accent bg-accent text-accent-foreground hover:border-[color:var(--sanad-champagne)] hover:bg-[color:var(--sanad-champagne)]"
                size="lg"
              >
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
