import { getLocalizedMetadata } from '@/lib/i18n/metadata';
import type { Metadata } from 'next';

import { CareerStory } from '@/components/home/career-story';
import { FeaturedPackages } from '@/components/home/featured-packages';
import { FinalCta } from '@/components/home/final-cta';
import { HeroSection } from '@/components/home/hero-section';
import { HowItWorks } from '@/components/home/how-it-works';
import { PremiumCta } from '@/components/home/premium-cta';
import { Testimonials } from '@/components/home/testimonials';
import { UaeCareerFocus } from '@/components/home/uae-career-focus';
import { WhySanad } from '@/components/home/why-sanad';

import { getCopy } from '@/lib/i18n/server-copy';

export async function generateMetadata(): Promise<Metadata> {
  const _copy = await getCopy();
  return await getLocalizedMetadata({
    title: _copy(
      'SANAD | Professional CV & Career Services',
      'سند | خدمات احترافية للسيرة الذاتية والمسار المهني',
    ),
    description: _copy(
      'Premium CV, LinkedIn, and career-document services for professionals in the UAE.',
      'خدمات متميزة للسيرة الذاتية وملف لينكدإن والوثائق المهنية للمحترفين في الإمارات.',
    ),
    alternates: { canonical: '/' },
  });
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturedPackages />
      <CareerStory />
      <WhySanad />
      <UaeCareerFocus />
      <HowItWorks />
      <PremiumCta />
      <Testimonials />
      <FinalCta />
    </>
  );
}
