import { CheckCircle2, Clock, Sparkles, TrendingUp } from 'lucide-react';

const stats = [
  {
    icon: Sparkles,
    value: '98%',
    label: 'ATS Pass Rate',
    description: 'Screening compliant for UAE & Gulf employers',
  },
  {
    icon: TrendingUp,
    value: '3.2x',
    label: 'More Interview Calls',
    description: 'Reported by clients within first 30 days',
  },
  {
    icon: Clock,
    value: '48-72h',
    label: 'Standard Delivery',
    description: 'Fast turnaround with dedicated review rounds',
  },
  {
    icon: CheckCircle2,
    value: '500+',
    label: 'Professionals Placed',
    description: 'Across Dubai, Abu Dhabi, Riyadh & Doha',
  },
] as const;

export function StatsBanner() {
  return (
    <section
      aria-label="SANAD Performance Metrics"
      className="border-b border-border bg-surface py-8 sm:py-10"
    >
      <div className="layout-container">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:gap-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                className="flex flex-col items-center text-center sm:items-start sm:text-left"
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
                    {stat.value}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold tracking-wide text-primary uppercase sm:text-sm">
                  {stat.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
