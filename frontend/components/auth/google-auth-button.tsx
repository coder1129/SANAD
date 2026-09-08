'use client';

import * as React from 'react';
import Script from 'next/script';

import type { CustomerAuthFlow } from '@/types/domain';
import { useCopy } from '@/lib/i18n/use-copy';
import { Button } from '@/components/ui/button';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback(response: GoogleCredentialResponse): void;
        ux_mode?: 'popup';
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          shape: 'rectangular';
          size: 'large';
          text: 'signin_with' | 'signup_with';
          theme: 'outline';
          type: 'standard';
          width: number;
        },
      ): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

interface GoogleAuthButtonProps {
  flow: CustomerAuthFlow;
  loading?: boolean;
  onCredential(credential: string): void;
  onError(message: string): void;
}

export function GoogleAuthButton({
  flow,
  loading = false,
  onCredential,
  onError,
}: GoogleAuthButtonProps) {
  const _copy = useCopy();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const callbackRef = React.useRef(onCredential);
  const errorRef = React.useRef(onError);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

  React.useEffect(() => {
    callbackRef.current = onCredential;
    errorRef.current = onError;
  }, [onCredential, onError]);

  const renderGoogleButton = React.useCallback(() => {
    if (!clientId || !containerRef.current || !window.google) return;

    containerRef.current.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: 'popup',
      callback: (response) => {
        if (!response.credential) {
          errorRef.current('Google authentication failed. Please try again.');
          return;
        }
        callbackRef.current(response.credential);
      },
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: flow === 'sign_up' ? 'signup_with' : 'signin_with',
      width: Math.min(400, Math.max(240, containerRef.current.clientWidth)),
    });
  }, [clientId, flow]);

  React.useEffect(() => {
    renderGoogleButton();
  }, [renderGoogleButton]);

  if (!clientId) {
    return (
      <Button className="h-11 w-full" disabled type="button" variant="outline">
        {_copy('Google authentication is not configured')}
      </Button>
    );
  }

  return (
    <div className="relative min-h-11 w-full">
      <Script
        id="google-identity-services"
        onError={() =>
          onError('Could not load Google authentication. Please try again.')
        }
        onReady={renderGoogleButton}
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
      <div
        aria-hidden={loading}
        className={loading ? 'pointer-events-none opacity-50' : undefined}
        ref={containerRef}
      />
      {loading ? (
        <div className="absolute inset-0 grid place-items-center rounded border border-border bg-surface/80 text-sm font-semibold text-primary">
          {_copy('Connecting to Google...')}
        </div>
      ) : null}
    </div>
  );
}
