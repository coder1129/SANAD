import type { Metadata } from 'next';
import Link from 'next/link';

import { VerifiedReviewCard } from '@/components/feedback/verified-review-card';
import { FeedbackSummary } from '@/components/feedback/feedback-summary';
import { Button } from '@/components/ui/button';
import { reviewsApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Client Feedback | SANAD',
  description:
    'Read published client feedback and service ratings from SANAD career services.',
  alternates: { canonical: '/feedback' },
};

export default async function FeedbackPage() {
  const result = await reviewsApi.listPublic({ limit: 100 }).catch(() => null);
  const reviews = result?.items ?? [];
  const summary = result?.summary ?? {
    averageRating: 0,
    totalReviews: 0,
    distribution: {},
  };

  return (
    <div className="bg-background">
      <section className="border-b border-primary-foreground/10 bg-primary text-primary-foreground">
        <div className="layout-container py-10 sm:py-14 lg:py-18">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-primary-foreground/65">
              <li>
                <Link className="hover:text-primary-foreground" href="/">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li
                aria-current="page"
                className="font-semibold text-primary-foreground"
              >
                Client Feedback
              </li>
            </ol>
          </nav>
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:gap-16">
            <div>
              <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-accent uppercase sm:text-sm">
                <span aria-hidden="true" className="h-px w-8 bg-accent" />
                Client feedback
              </p>
              <h1 className="type-h1 mt-5 max-w-3xl text-primary-foreground">
                Experiences that make the next step clearer.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/75 sm:text-lg sm:leading-8">
                Read published reviews from clients who used SANAD to strengthen
                the documents and profiles behind their next opportunity.
              </p>
            </div>
            {reviews.length > 0 ? (
              <FeedbackSummary
                count={summary.totalReviews}
                rating={summary.averageRating}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="layout-container layout-section">
        <div className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
              Verified and published
            </p>
            <h2 className="type-h2 mt-3 text-primary">What clients shared</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-right">
            Reviews are published after approval and stay connected to the
            service where the feedback was collected.
          </p>
        </div>

        {reviews.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {reviews.map((review) => (
              <VerifiedReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="mt-8 border border-dashed border-border bg-surface-muted px-6 py-14 text-center sm:px-10">
            <h3 className="text-lg font-semibold text-primary">
              Feedback is being collected.
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Published client reviews will appear here once they are approved
              for sharing.
            </p>
          </div>
        )}

        <div className="mt-12 border-t border-border pt-8">
          <Button asChild variant="outline">
            <Link href="/packages">Explore Services</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
