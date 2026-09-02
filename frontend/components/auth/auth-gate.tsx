'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { currentRelativeLocation, withNextParam } from '@/lib/auth';

export interface AuthGateProps {
  children: ReactNode;
  /**
   * Rendered when access is denied and no `redirectTo` was given — a message, an
   * inline sign-in prompt, or nothing.
   */
  denied?: ReactNode;
  /**
   * Rendered while the session is still being restored, and again while a
   * redirect is being performed. A skeleton belongs here; the unauthenticated
   * branch does not, because the session may well turn out to be valid.
   */
  fallback?: ReactNode;
  /** Internal path to send denied visitors to. External URLs are rejected. */
  redirectTo?: string;
  /** Append `?next=<current location>` so the target can return the visitor. */
  preserveNext?: boolean;
}

interface InternalAuthGateProps extends AuthGateProps {
  /** Whether the current session satisfies this gate. */
  allowed: boolean;
  /** The session is still unknown, so neither branch is correct yet. */
  pending: boolean;
}

/**
 * Shared machinery behind `RequireAuth`, `RequireRole` and `GuestOnly`: the
 * three-state render (pending / allowed / denied) and the redirect effect.
 *
 * Client-side by necessity — the session is restored in the browser, so the
 * server cannot know who this is. These gates decide what to render and where to
 * send someone; the backend decides what data anyone may have.
 */
export function AuthGate({
  allowed,
  children,
  denied = null,
  fallback = null,
  pending,
  preserveNext = false,
  redirectTo,
}: InternalAuthGateProps) {
  const router = useRouter();
  const shouldRedirect = !pending && !allowed && redirectTo !== undefined;

  useEffect(() => {
    if (!shouldRedirect || redirectTo === undefined) return;

    router.replace(
      preserveNext
        ? withNextParam(redirectTo, currentRelativeLocation())
        : redirectTo,
    );
  }, [preserveNext, redirectTo, router, shouldRedirect]);

  if (pending) return <>{fallback}</>;
  if (allowed) return <>{children}</>;

  // While the redirect is being applied the denied branch would only flash.
  return <>{shouldRedirect ? fallback : denied}</>;
}
