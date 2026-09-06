import {
  MotionAccentLine,
  MotionHeading,
  MotionReveal,
  MotionStaggerItem,
  MotionStaggerList,
} from '@/components/motion/motion-reveal';

const reasons = [
  {
    title: 'Substance Before Decoration',
    description:
      'Your experience and career direction lead the story; formatting supports the message instead of competing with it.',
  },
  {
    title: 'Context Shapes the Work',
    description:
      'Language and presentation are considered for professionals pursuing opportunities in the UAE market.',
  },
  {
    title: 'One Connected Story',
    description:
      'Your CV, LinkedIn profile, and supporting documents work together instead of sending mixed messages.',
  },
  {
    title: 'Readable at Every Stage',
    description:
      'Clear hierarchy and concise language support screening workflows while remaining straightforward for hiring teams to review.',
  },
] as const;

export function WhySanad() {
  return (
    <section
      aria-labelledby="why-sanad-heading"
      className="border-b border-border bg-surface-muted"
    >
      <div className="layout-container layout-section">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16 xl:gap-24">
          <div className="lg:pr-4">
            <MotionReveal direction="none">
              <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
                <MotionAccentLine className="h-px w-8 origin-left bg-accent" />
                Why SANAD
              </p>
            </MotionReveal>
            <MotionHeading
              className="type-h2 mt-5 max-w-[16ch]"
              id="why-sanad-heading"
              text="A Considered Approach to Career Presentation"
            />
            <MotionReveal delay={0.12} distance={14}>
              <p className="mt-6 max-w-[34rem] text-base leading-7 text-foreground/75 sm:text-lg sm:leading-8">
                Every choice—from content order to visual hierarchy—should make
                your professional story easier to understand.
              </p>
            </MotionReveal>
          </div>

          <MotionStaggerList
            className="border-y border-border"
            delay={0.08}
            ordered
            stagger={0.09}
          >
            {reasons.map(({ description, title }, index) => (
              <MotionStaggerItem
                className="grid gap-4 border-b border-border py-6 transition-colors duration-200 hover:bg-background/60 last:border-b-0 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-6 sm:py-7"
                key={title}
              >
                <span
                  aria-hidden="true"
                  className="font-display text-2xl leading-none text-accent sm:pt-0.5 sm:text-3xl"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="type-h4 text-primary">{title}</h3>
                  <p className="mt-2 max-w-[42rem] text-sm leading-6 text-foreground/75 sm:text-base sm:leading-7">
                    {description}
                  </p>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStaggerList>
        </div>
      </div>
    </section>
  );
}
