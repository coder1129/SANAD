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
import careerStoryImage from '@/public/images/home/career-story.png';

export async function CareerStory() {
  const _copy = await getCopy();

  const t = await getTranslations('home.careerStory');

  const storyPoints = [t('point1'), t('point2'), t('point3')];

  return (
    <section
      aria-labelledby="career-story-heading"
      className="border-b border-border bg-surface-muted"
    >
      <div className="layout-container layout-section">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16 xl:gap-24">
          <MotionMediaReveal
            className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface shadow-md"
            parallax
          >
            <Image
              alt={_copy(t('imageAlt'))}
              className="scale-[1.06] object-cover"
              fill
              placeholder="blur"
              sizes="(max-width: 1023px) calc(100vw - 2rem), 50vw"
              src={careerStoryImage}
            />
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1.5 bg-accent"
            />
          </MotionMediaReveal>

          <div>
            <MotionReveal direction="none">
              <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
                <MotionAccentLine className="h-px w-8 origin-left bg-accent" />
                {_copy(t('eyebrow'))}
              </p>
            </MotionReveal>
            <MotionHeading
              className="type-h2 mt-5 max-w-[16ch] text-primary"
              id="career-story-heading"
              text={_copy(t('heading'))}
            />
            <MotionReveal delay={0.12} distance={14}>
              <p className="mt-6 max-w-[38rem] text-base leading-7 text-foreground/75 sm:text-lg sm:leading-8">
                {_copy(t('body'))}
              </p>
            </MotionReveal>
            <MotionStaggerList
              className="mt-8 grid gap-4 border-t border-border pt-6"
              delay={0.14}
              stagger={0.08}
            >
              {storyPoints.map((point) => (
                <MotionStaggerItem
                  className="flex items-start gap-3 text-sm leading-6 text-foreground sm:text-base"
                  key={point}
                >
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface text-secondary shadow-xs">
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                  <span>{_copy(point)}</span>
                </MotionStaggerItem>
              ))}
            </MotionStaggerList>
          </div>
        </div>
      </div>
    </section>
  );
}
