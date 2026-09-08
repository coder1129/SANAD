import { getCopy } from '@/lib/i18n/server-copy';
import {
  Banknote,
  Building2,
  Cpu,
  HeartPulse,
  Landmark,
  Plane,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function IndustriesSection() {
  const _copy = await getCopy();

  const t = await getTranslations('home.industries');

  const industries = [
    {
      icon: Cpu,
      name: t('tech.name'),
      roles: t('tech.roles'),
    },
    {
      icon: Banknote,
      name: t('finance.name'),
      roles: t('finance.roles'),
    },
    {
      icon: Building2,
      name: t('engineering.name'),
      roles: t('engineering.roles'),
    },
    {
      icon: HeartPulse,
      name: t('healthcare.name'),
      roles: t('healthcare.roles'),
    },
    {
      icon: Landmark,
      name: t('government.name'),
      roles: t('government.roles'),
    },
    {
      icon: Plane,
      name: t('aviation.name'),
      roles: t('aviation.roles'),
    },
  ];

  return (
    <section
      aria-labelledby="industries-heading"
      className="border-b border-border bg-surface py-14 sm:py-18"
    >
      <div className="layout-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="flex items-center justify-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
            {_copy(t('eyebrow'))}
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
          </p>
          <h2 className="type-h2 mt-4 text-primary" id="industries-heading">
            {_copy(t('heading'))}
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
            {_copy(t('body'))}
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((item) => {
            const Icon = item.icon;
            return (
              <div
                className="group flex flex-col rounded-xl border border-border bg-surface-muted p-5 sm:p-6 transition-all duration-200 hover:border-accent hover:bg-surface hover:shadow-sm"
                key={item.name}
              >
                <div className="flex items-center gap-3.5">
                  <span className="grid size-10 place-items-center rounded-lg bg-surface text-primary shadow-2xs group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-sm font-bold text-primary sm:text-base">
                    {_copy(item.name)}
                  </h3>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {_copy(item.roles)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
