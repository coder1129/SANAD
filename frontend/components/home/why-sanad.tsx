import { getCopy } from '@/lib/i18n/server-copy';
import {
  MotionAccentLine,
  MotionHeading,
  MotionReveal,
  MotionStaggerItem,
  MotionStaggerList,
} from '@/components/motion/motion-reveal';
import { getTranslations } from 'next-intl/server';

export async function WhySanad() {
  const _copy = await getCopy();

  const t = await getTranslations('home.whySanad');

  const reasons = [
    { title: t('reason1Title'), description: t('reason1Desc') },
    { title: t('reason2Title'), description: t('reason2Desc') },
    { title: t('reason3Title'), description: t('reason3Desc') },
    { title: t('reason4Title'), description: t('reason4Desc') },
  ];

  return (
    <section
      aria-labelledby="why-sanad-heading"
      className="border-b border-border bg-surface-muted"
    >
      <div className="layout-container layout-section">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16 xl:gap-24">
          <div className="lg:pe-4">
            <MotionReveal direction="none">
              <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
                <MotionAccentLine className="h-px w-8 origin-left bg-accent" />
                {_copy(t('eyebrow'))}
              </p>
            </MotionReveal>
            <MotionHeading
              className="type-h2 mt-5 max-w-[16ch]"
              id="why-sanad-heading"
              text={_copy(t('heading'))}
            />
            <MotionReveal delay={0.12} distance={14}>
              <p className="mt-6 max-w-[34rem] text-base leading-7 text-foreground/75 sm:text-lg sm:leading-8">
                {_copy(t('body'))}
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
                  {_copy(String(index + 1).padStart(2, '0'))}
                </span>
                <div>
                  <h3 className="type-h4 text-primary">{_copy(title)}</h3>
                  <p className="mt-2 max-w-[42rem] text-sm leading-6 text-foreground/75 sm:text-base sm:leading-7">
                    {_copy(description)}
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
