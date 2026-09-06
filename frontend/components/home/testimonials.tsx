import {
  MotionAccentLine,
  MotionHeading,
  MotionReveal,
  MotionStaggerItem,
  MotionStaggerList,
} from '@/components/motion/motion-reveal';
import { Button } from '@/components/ui/button';
import { testimonialsApi } from '@/lib/api';
import Link from 'next/link';

import { FeedbackCard } from '../feedback/feedback-card';
import { FeedbackSummary } from '../feedback/feedback-summary';

export async function Testimonials() {
  let testimonials: Awaited<ReturnType<typeof testimonialsApi.list>> = [];
  try {
    testimonials = await testimonialsApi.list();
  } catch {
    // The home page remains useful if feedback is temporarily unavailable.
  }

  const visibleTestimonials = testimonials.slice(0, 3);
  const averageRating =
    testimonials.length > 0
      ? testimonials.reduce((total, item) => total + item.rating, 0) /
        testimonials.length
      : 0;

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="scroll-mt-24 border-b border-border bg-surface-muted"
      id="reviews"
    >
      <div className="layout-container py-14 sm:py-16 lg:py-20">
        <div className="grid gap-8 border-y border-border py-10 sm:py-12 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-center lg:gap-16 xl:gap-24">
          <div>
            <MotionReveal direction="none">
              <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
                <MotionAccentLine className="h-px w-8 origin-left bg-accent" />
                Client feedback
              </p>
            </MotionReveal>
            <MotionHeading
              className="type-h2 mt-5 max-w-[16ch]"
              id="testimonials-heading"
              text="Feedback, Shared Responsibly"
            />
            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
              Real words from clients who used SANAD to present their experience
              with more clarity.
            </p>
          </div>

          <MotionReveal
            className="relative border-t border-border pt-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12"
            delay={0.13}
            direction="right"
          >
            <p className="type-label text-secondary">
              Published client feedback
            </p>
            {testimonials.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <FeedbackSummary
                  count={testimonials.length}
                  rating={averageRating}
                />
                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-sm font-semibold text-primary">
                    Service-specific reviews
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Browse feedback by service and see what each experience
                    helped clients improve.
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 max-w-[32rem] text-base leading-7 text-muted-foreground">
                Published feedback will appear here as clients approve their
                reviews for sharing.
              </p>
            )}
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 h-px w-16 bg-accent lg:top-1/2 lg:h-16 lg:w-px lg:-translate-y-1/2"
            />
          </MotionReveal>
        </div>

        {visibleTestimonials.length > 0 ? (
          <MotionStaggerList className="mt-8 grid gap-5 md:grid-cols-3">
            {visibleTestimonials.map((testimonial) => (
              <MotionStaggerItem key={testimonial.id}>
                <FeedbackCard testimonial={testimonial} />
              </MotionStaggerItem>
            ))}
          </MotionStaggerList>
        ) : null}

        <div className="mt-8 flex justify-start">
          <Button asChild variant="outline">
            <Link href="/feedback">View all client feedback</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
