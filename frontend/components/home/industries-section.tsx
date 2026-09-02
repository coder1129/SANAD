import {
  Banknote,
  Building2,
  Cpu,
  HeartPulse,
  Landmark,
  Plane,
} from 'lucide-react';

const industries = [
  {
    icon: Cpu,
    name: 'Technology, AI & Software',
    roles: 'Engineering Managers, Product Leads, Data Scientists',
  },
  {
    icon: Banknote,
    name: 'Banking, Private Equity & FinTech',
    roles: 'Investment Bankers, Risk Analysts, CFOs',
  },
  {
    icon: Building2,
    name: 'Engineering, Real Estate & Construction',
    roles: 'Project Directors, Architects, Site Operations',
  },
  {
    icon: HeartPulse,
    name: 'Healthcare, Pharma & Medical',
    roles: 'Medical Directors, Clinical Specialists, Operations',
  },
  {
    icon: Landmark,
    name: 'Government & Semi-Government',
    roles: 'Policy Advisors, Strategy Directors, Public Sector Leads',
  },
  {
    icon: Plane,
    name: 'Aviation, Logistics & Supply Chain',
    roles: 'Operations Executives, Procurement Leads, Fleet Directors',
  },
] as const;

export function IndustriesSection() {
  return (
    <section
      aria-labelledby="industries-heading"
      className="border-b border-border bg-surface py-14 sm:py-18"
    >
      <div className="layout-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="flex items-center justify-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
            Specialized Regional Knowledge
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
          </p>
          <h2 className="type-h2 mt-4 text-primary" id="industries-heading">
            Targeted Expertise Across Core UAE & GCC Sectors
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
            Our career writers understand the exact terminology, KPIs, and
            competencies demanded by top employers in your specific industry.
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
                    {item.name}
                  </h3>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {item.roles}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
