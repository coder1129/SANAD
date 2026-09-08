import { getCopy } from '@/lib/i18n/server-copy';
import { Check } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import {
  MotionAccentLine,
  MotionHeading,
  MotionMediaReveal,
  MotionReveal,
  MotionStaggerItem,
  MotionStaggerList,
} from '@/components/motion/motion-reveal';
import uaeCareerFocusImage from '@/public/images/home/uae-career-focus.png';

export async function UaeCareerFocus() {
  const _copy = await getCopy();

  const t = await getTranslations('home.uaeCareerFocus');

  const focusPoints = [t('focus1'), t('focus2'), t('focus3'), t('focus4')];

  return (
    <section
      aria-labelledby="uae-career-focus-heading"
      className="border-b border-border bg-background"
    >
      <div className="layout-container layout-section">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-16 xl:gap-24">
          <div>
            <MotionReveal direction="none">
              <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
                <MotionAccentLine className="h-px w-8 origin-left bg-accent" />
                {_copy(t('eyebrow'))}
              </p>
            </MotionReveal>
            <MotionHeading
              className="type-h2 mt-5 max-w-[17ch] text-primary"
              id="uae-career-focus-heading"
              text={_copy(t('heading'))}
            />
            <MotionReveal delay={0.12} distance={14}>
              <p className="mt-6 max-w-[38rem] text-base leading-7 text-foreground/75 sm:text-lg sm:leading-8">
                {_copy(t('body'))}
              </p>
            </MotionReveal>
            <MotionStaggerList
              className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
              delay={0.12}
              stagger={0.07}
            >
              {focusPoints.map((point) => (
                <MotionStaggerItem
                  className="flex items-center gap-3 border-t border-border pt-3 text-sm font-semibold text-primary"
                  key={point}
                >
                  <Check
                    aria-hidden="true"
                    className="size-4 shrink-0 text-accent"
                  />
                  <span>{_copy(point)}</span>
                </MotionStaggerItem>
              ))}
            </MotionStaggerList>
          </div>

          <MotionMediaReveal
            className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-surface-muted shadow-md"
            parallax
          >
            <Image
              alt={_copy(t('imageAlt'))}
              className="scale-[1.06] object-cover"
              fill
              placeholder={_copy('blur')}
              sizes="(max-width: 1023px) calc(100vw - 2rem), 55vw"
              src={uaeCareerFocusImage}
            />
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-1.5 bg-primary"
            />
            <span
              aria-hidden="true"
              className="absolute right-0 bottom-0 h-1.5 w-1/4 bg-accent"
            />
          </MotionMediaReveal>
        </div>
      </div>
    </section>
  );
}
