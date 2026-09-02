import { FileCheck2, LayoutTemplate, UserRoundCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  MotionAccentLine,
  MotionHeading,
  MotionReveal,
  MotionStaggerItem,
  MotionStaggerList,
} from '@/components/motion/motion-reveal';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const featuredPackages = [
  {
    category: 'CV Service',
    title: 'Professional CV',
    description:
      'A focused CV that presents your experience, strengths, and career direction with clarity.',
    bestFor: 'Building or refining your core application document.',
    benefits: [
      'ATS-conscious content structure',
      'Achievement-led experience sections',
      'Clear, recruiter-friendly formatting',
    ],
    icon: FileCheck2,
  },
  {
    category: 'Profile Service',
    title: 'LinkedIn Optimization',
    description:
      'A refined profile that brings your headline, summary, and experience into one consistent professional story.',
    bestFor: 'Strengthening your professional presence beyond the CV.',
    benefits: [
      'Focused headline and About section',
      'Consistent experience positioning',
      'Practical profile improvement guidance',
    ],
    icon: UserRoundCheck,
  },
  {
    category: 'Application Support',
    title: 'Career Documents',
    description:
      'Supporting application materials shaped to carry one clear professional message.',
    bestFor: 'Keeping supporting application materials consistent.',
    benefits: [
      'Cover letter development',
      'Consistent voice across documents',
      'Polished, role-relevant presentation',
    ],
    icon: LayoutTemplate,
  },
] as const;

export function FeaturedPackages() {
  return (
    <section
      aria-labelledby="featured-packages-heading"
      className="scroll-mt-24 border-b border-border bg-background"
      id="services"
    >
      <div className="layout-container layout-section">
        <div className="grid gap-6 border-b border-border pb-10 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] md:items-end md:gap-12 lg:pb-12">
          <div>
            <MotionReveal direction="none">
              <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
                <MotionAccentLine className="h-px w-8 origin-left bg-accent" />
                Featured services
              </p>
            </MotionReveal>
            <MotionHeading
              className="type-h2 mt-5 max-w-[17ch]"
              id="featured-packages-heading"
              text="Career Services Built Around Your Next Move"
            />
          </div>

          <MotionReveal
            className="md:justify-self-end"
            delay={0.12}
            direction="right"
          >
            <p className="max-w-[34rem] text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
              Choose focused support for the documents and profiles that
              represent you throughout the hiring process.
            </p>
          </MotionReveal>
        </div>

        <MotionStaggerList className="mt-10 grid gap-5 md:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {featuredPackages.map(
            ({
              bestFor,
              benefits,
              category,
              description,
              icon: Icon,
              title,
            }) => (
              <MotionStaggerItem
                className="md:last:col-span-2 md:last:mx-auto md:last:w-[calc(50%-0.625rem)] lg:last:col-span-1 lg:last:mx-0 lg:last:w-auto"
                hoverLift
                key={title}
              >
                <Card className="group relative flex h-full flex-col overflow-hidden border-t-2 border-t-accent shadow-xs transition-shadow duration-300 hover:shadow-md focus-within:shadow-md motion-reduce:transition-none">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 z-10 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-500 ease-[var(--ease-standard)] motion-safe:group-hover:scale-x-100 motion-safe:group-focus-within:scale-x-100 motion-reduce:transition-none"
                  />
                  <CardHeader className="gap-0 border-b border-border/70">
                    <div className="flex items-center justify-between gap-4">
                      <Badge
                        className="tracking-[0.08em] uppercase"
                        variant="secondary"
                      >
                        {category}
                      </Badge>
                      <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-surface-muted text-secondary transition-transform duration-300 ease-[var(--ease-standard)] motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:rotate-3 motion-reduce:transition-none">
                        <Icon
                          aria-hidden="true"
                          className="size-5"
                          strokeWidth={1.7}
                        />
                      </span>
                    </div>

                    <CardTitle className="mt-6 text-primary">{title}</CardTitle>
                    <CardDescription className="mt-3 text-base leading-7">
                      {description}
                    </CardDescription>

                    <div className="mt-5 border-t border-border/70 pt-4">
                      <p className="type-label text-primary">Best for</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {bestFor}
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col pt-5 sm:pt-6">
                    <p className="type-label text-primary">
                      What this service supports
                    </p>
                    <ul className="mt-4 grid gap-3">
                      {benefits.map((benefit) => (
                        <li
                          className="flex items-start gap-3 text-sm leading-6 text-foreground"
                          key={benefit}
                        >
                          <span
                            aria-hidden="true"
                            className="mt-3 h-px w-4 shrink-0 bg-accent"
                          />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </MotionStaggerItem>
            ),
          )}
        </MotionStaggerList>
      </div>
    </section>
  );
}
