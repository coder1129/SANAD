import { getCopy } from '@/lib/i18n/server-copy';
import { CheckCircle2, Clock, Sparkles, TrendingUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function StatsBanner() {
  const _copy = await getCopy();

  const t = await getTranslations('home.stats');

  const stats = [
    {
      icon: Sparkles,
      value: t('atsValue'),
      label: t('atsLabel'),
      description: t('atsDesc'),
    },
    {
      icon: TrendingUp,
      value: t('interviewValue'),
      label: t('interviewLabel'),
      description: t('interviewDesc'),
    },
    {
      icon: Clock,
      value: t('deliveryValue'),
      label: t('deliveryLabel'),
      description: t('deliveryDesc'),
    },
    {
      icon: CheckCircle2,
      value: t('placedValue'),
      label: t('placedLabel'),
      description: t('placedDesc'),
    },
  ];

  return (
    <section
      aria-label={_copy(t('ariaLabel'))}
      className="border-b border-border bg-surface py-8 sm:py-10"
    >
      <div className="layout-container">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:gap-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                className="flex flex-col items-center text-center sm:items-start sm:text-start"
                key={stat.label}
              >
                <div className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-accent/15 text-secondary sm:size-8">
                    <Icon
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={2}
                    />
                  </span>
                  <span className="font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl lg:text-4xl">
                    {_copy(stat.value)}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold tracking-wide text-primary uppercase sm:text-sm">
                  {_copy(stat.label)}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {_copy(stat.description)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
