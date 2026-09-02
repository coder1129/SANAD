import { ArrowRight, FileCheck2, MapPin, PenLine } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { PUBLIC_SERVICES_HREF } from '@/constants/public-navigation';
import {
  MotionAccentLine,
  MotionHeading,
  MotionMediaReveal,
  MotionReveal,
  MotionStaggerItem,
  MotionStaggerList,
} from '@/components/motion/motion-reveal';
import heroCareerProfile from '@/public/images/home/hero-career-profile.png';

const trustIndicators = [
  { icon: FileCheck2, label: 'ATS-Conscious' },
  { icon: MapPin, label: 'UAE Career Focused' },
  { icon: PenLine, label: 'Professionally Crafted' },
] as const;

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden border-b border-border bg-surface-muted"
    >
      <div
        aria-hidden="true"
        className="sanad-hero-orbit absolute top-20 right-[-9rem] size-72 rounded-full border border-accent/20 sm:size-96 lg:top-12 lg:right-[-5rem] lg:size-[30rem]"
      />
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 hidden h-full w-[42%] border-l border-border/60 bg-surface/45 lg:block"
      />

      <div className="layout-container relative grid items-center gap-12 py-14 sm:gap-16 sm:py-18 md:py-20 lg:min-h-[42rem] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-8 lg:py-14 xl:min-h-[44rem] xl:gap-14">
        <div className="max-w-2xl lg:py-8">
          <MotionReveal delay={0.05} direction="none">
            <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
              <MotionAccentLine className="h-px w-8 origin-left bg-accent" />
              Career documents, refined
            </p>
          </MotionReveal>

          <MotionHeading
            className="mt-5 max-w-[15ch] font-display text-[clamp(2.625rem,5.2vw,4.5rem)] leading-[0.99] tracking-[-0.04em] text-primary sm:mt-6"
            delay={0.11}
            id="hero-heading"
            level={1}
            lines={['Build a Career Profile', 'That Opens Doors.']}
            text="Build a Career Profile That Opens Doors."
          />

          <MotionReveal delay={0.3} distance={14}>
            <p className="mt-6 max-w-[37rem] text-base leading-7 text-foreground sm:text-lg sm:leading-8">
              Present your experience clearly across a professional CV, LinkedIn
              profile, cover letter, and supporting career documents.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.4} distance={14}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild className="group w-full sm:w-auto" size="lg">
                <Link href={PUBLIC_SERVICES_HREF}>
                  View Career Services
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-200 ease-[var(--ease-standard)] motion-safe:group-hover:translate-x-0.5 motion-safe:group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
                  />
                </Link>
              </Button>
              <Button
                asChild
                className="w-full bg-surface/70 sm:w-auto"
                size="lg"
                variant="outline"
              >
                <Link href="/#how-it-works">See How It Works</Link>
              </Button>
            </div>

            <p className="mt-4 max-w-[34rem] text-sm leading-6 text-foreground/70">
              Choose the service that matches your current career-document
              needs.
            </p>
          </MotionReveal>

          <MotionStaggerList
            ariaLabel="SANAD service qualities"
            className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-6"
            delay={0.48}
            stagger={0.07}
          >
            {trustIndicators.map(({ icon: Icon, label }) => (
              <MotionStaggerItem
                className="flex min-h-9 items-center gap-2.5 text-sm font-medium text-foreground"
                key={label}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-sm border border-border bg-surface text-secondary shadow-xs">
                  <Icon
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.8}
                  />
                </span>
                {label}
              </MotionStaggerItem>
            ))}
          </MotionStaggerList>
        </div>

        <MotionMediaReveal
          className="relative mx-auto w-full max-w-[38rem] lg:mx-0 lg:justify-self-end"
          delay={0.16}
        >
          <HeroCareerVisual />
        </MotionMediaReveal>
      </div>
    </section>
  );
}

function HeroCareerVisual() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-surface shadow-lg sm:aspect-[5/6] lg:h-[37rem] lg:aspect-auto">
      <Image
        alt="Premium CV, cover letter, and professional profile documents arranged in a contemporary UAE office"
        className="object-cover"
        fill
        placeholder="blur"
        preload
        sizes="(max-width: 1023px) calc(100vw - 2rem), 42vw"
        src={heroCareerProfile}
      />
      <div
        aria-hidden="true"
        className="sanad-hero-frame-line absolute inset-x-0 top-0 h-1.5 origin-left bg-primary"
      />
      <div
        aria-hidden="true"
        className="sanad-hero-frame-accent absolute top-0 right-0 h-1.5 w-[28%] origin-right bg-accent"
      />
    </div>
  );
}
