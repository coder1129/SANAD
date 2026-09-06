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

export const metadata: Metadata = {
  title: 'SANAD | Professional CV & Career Services',
  description:
    'Premium CV, LinkedIn, and career-document services for professionals in the UAE.',
  alternates: { canonical: '/' },
};

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
