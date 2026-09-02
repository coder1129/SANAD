import {
  MotionAccentLine,
  MotionHeading,
  MotionReveal,
  MotionStaggerItem,
  MotionTimeline,
} from '@/components/motion/motion-reveal';

const steps = [
  {
    number: '01',
    title: 'Choose Your Service',
    description:
      'Choose the support that matches the career document or profile you want to improve.',
  },
  {
    number: '02',
    title: 'Share Your Details',
    description:
      'Provide your existing documents, professional details, and target-role context.',
  },
  {
    number: '03',
    title: 'Receive Your Career Documents',
    description: 'Access the completed work through your SANAD order.',
  },
] as const;

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-24 border-b border-border bg-background"
      id="how-it-works"
    >
      <div className="layout-container layout-section">
        <div className="max-w-2xl">
          <MotionReveal direction="none">
            <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
              <MotionAccentLine className="h-px w-8 origin-left bg-accent" />
              How it works
            </p>
          </MotionReveal>
          <MotionHeading
            className="type-h2 mt-5 max-w-[20ch]"
            id="how-it-works-heading"
            text="A Clear Path to Stronger Career Documents"
          />
          <MotionReveal delay={0.12} distance={14}>
            <p className="mt-6 max-w-[42rem] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Choose a service, share the relevant context, and receive your
              completed career documents through the SANAD order process.
            </p>
          </MotionReveal>
        </div>

        <MotionTimeline className="mt-12 grid border-y border-border pl-6 lg:mt-14 lg:grid-cols-3 lg:pl-0">
          {steps.map(({ description, number, title }) => (
            <MotionStaggerItem
              className="border-b border-border py-8 last:border-b-0 sm:py-10 lg:border-r lg:border-b-0 lg:px-8 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              key={number}
            >
              <div className="flex items-center gap-5">
                <span
                  aria-hidden="true"
                  className="font-display text-[2.5rem] leading-none text-accent sm:text-5xl"
                >
                  {number}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-accent/45" />
              </div>
              <h3 className="type-h4 mt-6 text-primary">{title}</h3>
              <p className="mt-3 max-w-[34rem] text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {description}
              </p>
            </MotionStaggerItem>
          ))}
        </MotionTimeline>
      </div>
    </section>
  );
}
