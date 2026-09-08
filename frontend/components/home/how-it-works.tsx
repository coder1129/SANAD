import { getCopy } from '@/lib/i18n/server-copy';
import {
  MotionAccentLine,
  MotionHeading,
  MotionReveal,
  MotionStaggerItem,
  MotionTimeline,
} from '@/components/motion/motion-reveal';
import { getTranslations } from 'next-intl/server';

export async function HowItWorks() {
  const _copy = await getCopy();

  const t = await getTranslations('home.howItWorks');

  const steps = [
    {
      number: t('step1Number'),
      title: t('step1Title'),
      description: t('step1Desc'),
    },
    {
      number: t('step2Number'),
      title: t('step2Title'),
      description: t('step2Desc'),
    },
    {
      number: t('step3Number'),
      title: t('step3Title'),
      description: t('step3Desc'),
    },
  ];

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
              {_copy(t('eyebrow'))}
            </p>
          </MotionReveal>
          <MotionHeading
            className="type-h2 mt-5 max-w-[20ch]"
            id="how-it-works-heading"
            text={_copy(t('heading'))}
          />
          <MotionReveal delay={0.12} distance={14}>
            <p className="mt-6 max-w-[42rem] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              {_copy(t('body'))}
            </p>
          </MotionReveal>
        </div>

        <MotionTimeline className="mt-12 grid border-y border-border ps-6 lg:mt-14 lg:grid-cols-3 lg:ps-0">
          {steps.map(({ description, number, title }) => (
            <MotionStaggerItem
              className="border-b border-border py-8 transition-colors duration-200 hover:bg-surface-muted/55 last:border-b-0 sm:py-10 lg:border-e lg:border-b-0 lg:px-8 lg:first:ps-0 lg:last:border-e-0 lg:last:pe-0"
              key={number}
            >
              <div className="flex items-center gap-5">
                <span
                  aria-hidden="true"
                  className="font-display text-[2.5rem] leading-none text-accent sm:text-5xl"
                >
                  {_copy(number)}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-accent/45" />
              </div>
              <h3 className="type-h4 mt-6 text-primary">{_copy(title)}</h3>
              <p className="mt-3 max-w-[34rem] text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {_copy(description)}
              </p>
            </MotionStaggerItem>
          ))}
        </MotionTimeline>
      </div>
    </section>
  );
}
