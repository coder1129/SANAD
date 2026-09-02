import {
  MotionAccentLine,
  MotionHeading,
  MotionReveal,
} from '@/components/motion/motion-reveal';

export function Testimonials() {
  return (
    <section
      aria-labelledby="testimonials-heading"
      className="scroll-mt-24 border-b border-border bg-surface-muted"
      id="reviews"
    >
      <div className="layout-container py-14 sm:py-16 lg:py-20">
        <div className="grid gap-8 border-y border-border py-8 sm:py-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-center lg:gap-16 xl:gap-24">
          <div>
            <MotionReveal direction="none">
              <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
                <MotionAccentLine className="h-px w-8 origin-left bg-accent" />
                Client feedback
              </p>
            </MotionReveal>
            <MotionHeading
              className="type-h2 mt-5 max-w-[16ch]"
              id="testimonials-heading"
              text="Feedback, Shared Responsibly"
            />
          </div>

          <MotionReveal
            className="relative border-t border-border pt-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12"
            delay={0.13}
            direction="right"
          >
            <p className="type-label text-secondary">Verified feedback only</p>
            <p className="mt-4 max-w-[32rem] font-display text-xl leading-snug tracking-[-0.02em] text-primary sm:text-2xl">
              Verified client feedback will appear here when it becomes
              available.
            </p>
            <p className="mt-4 max-w-[34rem] text-sm leading-6 text-foreground/75 sm:text-base sm:leading-7">
              SANAD publishes feedback only when it has been approved and can be
              shared accurately.
            </p>
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 h-px w-16 bg-accent lg:top-1/2 lg:h-16 lg:w-px lg:-translate-y-1/2"
            />
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}
