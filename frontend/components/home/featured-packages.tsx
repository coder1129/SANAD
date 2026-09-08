import { getCopy } from '@/lib/i18n/server-copy';
import Link from 'next/link';
import {
  ArrowRight,
  FileCheck2,
  LayoutTemplate,
  UserRoundCheck,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MotionAccentLine,
  MotionHeading,
  MotionReveal,
  MotionStaggerItem,
  MotionStaggerList,
} from '@/components/motion/motion-reveal';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export async function FeaturedPackages() {
  const _copy = await getCopy();

  const t = await getTranslations('home.featuredPackages');

  const featuredPackages = [
    {
      category: t('cv.category'),
      title: t('cv.title'),
      description: t('cv.description'),
      icon: FileCheck2,
      href: '/packages',
    },
    {
      category: t('linkedin.category'),
      title: t('linkedin.title'),
      description: t('linkedin.description'),
      icon: UserRoundCheck,
      href: '/packages',
    },
    {
      category: t('linkedinJobs.category'),
      title: t('linkedinJobs.title'),
      description: t('linkedinJobs.description'),
      icon: LayoutTemplate,
      href: '/packages',
    },
  ];

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
                {_copy(t('eyebrow'))}
              </p>
            </MotionReveal>
            <MotionHeading
              className="type-h2 mt-5 max-w-[17ch]"
              id="featured-packages-heading"
              text={_copy(t('heading'))}
            />
          </div>

          <MotionReveal
            className="md:justify-self-end"
            delay={0.12}
            direction="right"
          >
            <p className="max-w-[34rem] text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
              {_copy(t('body'))}
            </p>
          </MotionReveal>
        </div>

        <MotionStaggerList className="mt-10 grid gap-5 md:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {featuredPackages.map(
            ({ category, description, href, icon: Icon, title }) => (
              <MotionStaggerItem
                className="md:last:col-span-2 md:last:mx-auto md:last:w-[calc(50%-0.625rem)] lg:last:col-span-1 lg:last:mx-0 lg:last:w-auto"
                hoverLift
                key={title}
              >
                <Card className="group relative flex h-full flex-col overflow-hidden border-t-2 border-t-accent shadow-xs transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-md focus-within:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 z-10 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-500 ease-[var(--ease-standard)] motion-safe:group-hover:scale-x-100 motion-safe:group-focus-within:scale-x-100 motion-reduce:transition-none"
                  />
                  <CardHeader className="gap-0">
                    <div className="flex items-center justify-between gap-4">
                      <Badge
                        className="tracking-[0.08em] uppercase"
                        variant="secondary"
                      >
                        {_copy(category)}
                      </Badge>
                      <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-surface-muted text-secondary transition-transform duration-300 ease-[var(--ease-standard)] motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:rotate-3 motion-reduce:transition-none">
                        <Icon
                          aria-hidden="true"
                          className="size-5"
                          strokeWidth={1.7}
                        />
                      </span>
                    </div>

                    <CardTitle className="mt-5 text-primary text-xl font-bold">
                      {_copy(title)}
                    </CardTitle>
                    <CardDescription className="mt-3 text-sm leading-6 text-muted-foreground">
                      {_copy(description)}
                    </CardDescription>
                  </CardHeader>

                  <CardFooter className="mt-auto pt-4 border-t border-border/60">
                    <Button
                      asChild
                      className="group/btn w-full justify-between"
                      variant="ghost"
                    >
                      <Link href={href}>
                        <span className="font-semibold text-primary group-hover/btn:text-accent-foreground">
                          {_copy(t('exploreService'))}
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 rtl:rotate-180 transition-transform duration-200 motion-safe:group-hover/btn:translate-x-1 rtl:motion-safe:group-hover/btn:-translate-x-1"
                        />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </MotionStaggerItem>
            ),
          )}
        </MotionStaggerList>
      </div>
    </section>
  );
}
