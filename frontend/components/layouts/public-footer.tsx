import Link from 'next/link';

import {
  MotionAccentLine,
  MotionReveal,
} from '@/components/motion/motion-reveal';
import { BrandLogo } from '@/components/shared/brand-logo';
import {
  PUBLIC_FOOTER_GROUPS,
  PUBLIC_LEGAL_LINKS,
} from '@/constants/public-navigation';
import { PublicSocialLinks } from './public-social-links';

const footerLinkClassName =
  'inline-flex min-h-11 items-center text-sm leading-6 text-primary-foreground/75 transition-colors duration-200 hover:text-primary-foreground';

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-primary-foreground/10 bg-primary text-primary-foreground">
      <div className="layout-container py-14 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))] lg:gap-8">
          <MotionReveal
            className="grid content-start gap-5"
            direction="left"
            distance={24}
            initialOpacity={0.6}
          >
            <Link
              aria-label="SANAD home"
              className="w-fit rounded-md bg-surface p-1.5 shadow-xs"
              href="/"
            >
              <BrandLogo size="md" />
            </Link>
            <p className="max-w-sm text-sm leading-7 text-primary-foreground/75">
              Professional career services designed to help you stand out.
            </p>
            <PublicSocialLinks className="pt-1" />
          </MotionReveal>

          {PUBLIC_FOOTER_GROUPS.map((group, index) => (
            <MotionReveal
              delay={0.08 + index * 0.08}
              direction="up"
              distance={18}
              initialOpacity={0.6}
              key={group.label}
            >
              <nav aria-label={`${group.label} links`}>
                <h2 className="text-sm font-semibold tracking-[0.08em] text-accent uppercase">
                  {group.label}
                </h2>
                <ul className="mt-4 grid gap-1">
                  {group.links.map((item) => (
                    <li key={item.label}>
                      <Link className={footerLinkClassName} href={item.href}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </MotionReveal>
          ))}
        </div>

        <MotionAccentLine className="my-8 block h-px w-full origin-left bg-primary-foreground/20" />

        <MotionReveal delay={0.2} direction="none" initialOpacity={0.65}>
          <div className="flex flex-col gap-4 text-sm text-primary-foreground/70 sm:flex-row sm:items-center sm:justify-between">
            <p>© {year} SANAD. All rights reserved.</p>
            <nav aria-label="Legal links">
              <ul className="flex flex-wrap gap-x-6 gap-y-1">
                {PUBLIC_LEGAL_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link className={footerLinkClassName} href={item.href}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </MotionReveal>
      </div>
    </footer>
  );
}
