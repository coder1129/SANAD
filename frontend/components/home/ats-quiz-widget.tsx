'use client';

import { ArrowRight, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { AuthModalTrigger } from '@/components/auth/auth-modal-trigger';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    id: 'level',
    title: 'What is your target career level?',
    options: [
      {
        label: 'Executive / Director / C-Suite',
        sub: '10+ years of leadership',
        points: 30,
      },
      {
        label: 'Mid-to-Senior Professional',
        sub: '4–9 years of experience',
        points: 25,
      },
      {
        label: 'Early Career / Specialist',
        sub: '1–3 years of experience',
        points: 20,
      },
    ],
  },
  {
    id: 'market',
    title: 'Which region are you actively targeting?',
    options: [
      {
        label: 'UAE (Dubai & Abu Dhabi)',
        sub: 'Highly competitive multinational market',
        points: 35,
      },
      {
        label: 'Saudi Arabia (Riyadh & Eastern)',
        sub: 'Rapid Vision 2030 expansion',
        points: 35,
      },
      {
        label: 'Wider GCC / International',
        sub: 'Qatar, Kuwait, Bahrain & Global',
        points: 30,
      },
    ],
  },
  {
    id: 'status',
    title: 'What is the current state of your CV?',
    options: [
      {
        label: 'Outdated / Needs a Complete Overhaul',
        sub: 'Has not been updated or lacks ATS keywords',
        points: 15,
      },
      {
        label: 'Standard Template / General List of Duties',
        sub: 'Lacks quantified metrics and executive voice',
        points: 25,
      },
      {
        label: 'Recently Updated but Getting Few Interviews',
        sub: 'Needs professional positioning & recruiter polish',
        points: 35,
      },
    ],
  },
];

export function AtsQuizWidget() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (points: number) => {
    const nextAnswers = [...selectedAnswers, points];
    setSelectedAnswers(nextAnswers);

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setSelectedAnswers([]);
    setShowResult(false);
  };

  const calculateScore = () => {
    const total = selectedAnswers.reduce((a, b) => a + b, 0);
    return Math.min(Math.round((total / 100) * 100), 96);
  };

  return (
    <section
      aria-label="Interactive ATS Assessment"
      className="border-b border-border bg-gradient-to-b from-surface to-surface-muted py-14 sm:py-18"
    >
      <div className="layout-container max-w-4xl">
        <div className="mx-auto text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary">
            <Sparkles className="size-3.5 text-accent" />
            Interactive Career Tool
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl lg:text-4xl mt-3">
            Check Your ATS & Market Readiness
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Answer 3 quick questions to evaluate your CV&rsquo;s competitive
            readiness for UAE & GCC employers.
          </p>
        </div>

        {/* Assessment Card */}
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-md sm:p-8">
          {!showResult ? (
            <div>
              {/* Step indicator */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  Question {currentStep + 1} of {STEPS.length}
                </span>
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <div
                      className={`h-1.5 w-8 rounded-full transition-colors ${
                        i <= currentStep ? 'bg-accent' : 'bg-border'
                      }`}
                      key={i}
                    />
                  ))}
                </div>
              </div>

              {/* Question title */}
              <h3 className="mt-5 text-base font-bold text-primary sm:text-lg">
                {STEPS[currentStep].title}
              </h3>

              {/* Options */}
              <div className="mt-5 space-y-3">
                {STEPS[currentStep].options.map((opt) => (
                  <button
                    className="group flex w-full items-center justify-between rounded-xl border border-border p-4 text-left transition-all duration-200 hover:border-accent hover:bg-surface-muted hover:shadow-xs active:scale-[0.99]"
                    key={opt.label}
                    onClick={() => handleSelect(opt.points)}
                    type="button"
                  >
                    <div>
                      <p className="text-sm font-semibold text-primary group-hover:text-secondary">
                        {opt.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {opt.sub}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent shrink-0 ml-3" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-700">
                <CheckCircle2 className="size-8" />
              </div>

              <h3 className="mt-4 font-display text-2xl font-bold text-primary">
                Assessment Completed!
              </h3>

              <div className="mt-4 inline-flex items-baseline gap-2 rounded-xl border border-border bg-surface-muted px-6 py-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Estimated Current Market Score:
                </span>
                <span className="font-display text-2xl font-bold text-primary">
                  {calculateScore()}%
                </span>
              </div>

              <p className="mx-auto mt-4 max-w-lg text-sm text-foreground/85 leading-relaxed">
                Your profile has strong potential, but without tailored Gulf ATS
                keywords and achievement metrics, you may be missing out on up
                to <strong>70% of employer screenings</strong>.
              </p>

              <div className="mt-6 flex flex-col gap-3 justify-center sm:flex-row">
                <AuthModalTrigger className="h-11 px-6 shadow-sm" size="lg">
                  Upgrade to a 98% ATS-Optimized CV
                  <ArrowRight className="size-4 ml-1" />
                </AuthModalTrigger>
                <Button
                  className="h-11"
                  onClick={handleReset}
                  size="lg"
                  variant="outline"
                >
                  <RotateCcw className="size-4 mr-2" />
                  Retake Assessment
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
