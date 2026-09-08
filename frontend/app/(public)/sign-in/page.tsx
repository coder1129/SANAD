import { Suspense } from 'react';

import { SignInFlow } from '@/components/auth';

export default function SignInRoute() {
  return (
    <main className="section-shell py-12 sm:py-20">
      <div className="mx-auto max-w-[34rem] rounded-[20px] border border-border/70 bg-surface p-6 shadow-xl shadow-primary/10 sm:p-9">
        <Suspense>
          <SignInFlow />
        </Suspense>
      </div>
    </main>
  );
}
