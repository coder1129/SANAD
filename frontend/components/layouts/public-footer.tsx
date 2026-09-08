import { getCopy } from '@/lib/i18n/server-copy';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import {
  MotionAccentLine,
  MotionReveal,
} from '@/components/motion/motion-reveal';
import { BrandLogo } from '@/components/shared/brand-logo';
import { PublicSocialLinks } from './public-social-links';

const footerLinkClassName =
  'inline-flex min-h-11 items-center text-sm leading-6 text-primary-foreground/75 transition-colors duration-200 hover:text-primary-foreground';
const SUPPORT_EMAIL = 'saanadcv@gmail.com';

export async function PublicFooter() {
  const _copy = await getCopy();

  const year = new Date().getFullYear();
  const t = await getTranslations();

  const footerGroups = [
    {
      label: t('footer.explore'),
      links: [
        { href: '/', label: t('nav.home') },
        { href: '/packages', label: t('nav.services') },
        { href: '/#how-it-works', label: t('nav.howItWorks') },
      ],
    },
    {
      label: t('footer.company'),
      links: [
        { href: '/pages/about-us', label: t('nav.aboutUs') },
        { href: '/feedback', label: t('nav.clientFeedback') },
      ],
    },
    {
      label: t('footer.support'),
      links: [
        { href: '/faq', label: t('nav.faq') },
        { href: `mailto:${SUPPORT_EMAIL}`, label: SUPPORT_EMAIL },
      ],
    },
  ];

  const legalLinks = [
    { href: '/pages/privacy-policy', label: t('footer.privacyPolicy') },
    {
      href: '/pages/terms-and-conditions',
      label: t('footer.termsAndConditions'),
    },
  ];

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
              aria-label={_copy('SANAD home')}
              className="w-fit rounded-md bg-surface p-1.5 shadow-xs"
              href="/"
            >
              <BrandLogo size="md" />
            </Link>
            <p className="max-w-sm text-sm leading-7 text-primary-foreground/75">
              {_copy(t('footer.tagline'))}
            </p>
            <PublicSocialLinks className="pt-1" />
          </MotionReveal>

          {footerGroups.map((group, index) => (
            <MotionReveal
              delay={0.08 + index * 0.08}
              direction="up"
              distance={18}
              initialOpacity={0.6}
              key={group.label}
            >
              <nav
                aria-label={_copy(
                  `${group.label} links`,
                  `روابط ${_copy(group.label)}`,
                )}
              >
                <h2 className="text-sm font-semibold tracking-[0.08em] text-accent uppercase">
                  {_copy(group.label)}
                </h2>
                <ul className="mt-4 grid gap-1">
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link className={footerLinkClassName} href={item.href}>
                        {_copy(item.label)}
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
            <p>{_copy(t('footer.copyright', { year }))}</p>
            <nav aria-label={_copy(t('footer.legalLinks'))}>
              <ul className="flex flex-wrap gap-x-6 gap-y-1">
                {legalLinks.map((item) => (
                  <li key={item.href}>
                    <Link className={footerLinkClassName} href={item.href}>
                      {_copy(item.label)}
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
