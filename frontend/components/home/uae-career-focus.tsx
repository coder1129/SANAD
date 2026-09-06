import { Check } from 'lucide-react';
import Image from 'next/image';

import {
  MotionAccentLine,
  MotionHeading,
  MotionMediaReveal,
  MotionReveal,
  MotionStaggerItem,
  MotionStaggerList,
} from '@/components/motion/motion-reveal';
import uaeCareerFocusImage from '@/public/images/home/uae-career-focus.png';

const focusPoints = [
  'Clear Professional Positioning',
  'Consistent Career Documents',
  'Modern Professional Presentation',
  'UAE-Focused Career Services',
] as const;

export function UaeCareerFocus() {
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
                Built for professional ambition
              </p>
            </MotionReveal>
            <MotionHeading
              className="type-h2 mt-5 max-w-[17ch] text-primary"
              id="uae-career-focus-heading"
              text="Professional Presentation for a Competitive UAE Market"
            />
            <MotionReveal delay={0.12} distance={14}>
              <p className="mt-6 max-w-[38rem] text-base leading-7 text-foreground/75 sm:text-lg sm:leading-8">
                SANAD helps professionals present their experience with clarity,
                consistency, and confidence when pursuing opportunities across
                the UAE.
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
                  <span>{point}</span>
                </MotionStaggerItem>
              ))}
            </MotionStaggerList>
          </div>

          <MotionMediaReveal
            className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-surface-muted shadow-md"
            parallax
          >
            <Image
              alt="Contemporary UAE corporate office overlooking a modern business district"
              className="scale-[1.06] object-cover"
              fill
              placeholder="blur"
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
