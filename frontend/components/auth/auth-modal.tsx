'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

import { SignInFlow } from './sign-in-flow';
import { SignUpFlow } from './sign-up-flow';

export type AuthModalMode = 'sign-in' | 'sign-up';
type OpenAuthModal = (next?: string, mode?: AuthModalMode) => void;

const AuthModalContext = React.createContext<OpenAuthModal | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const _copy = useCopy();

  const [nextTarget, setNextTarget] = React.useState<string>();
  const [mode, setMode] = React.useState<AuthModalMode>('sign-in');
  const [open, setOpen] = React.useState(false);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  const openModal = React.useCallback(
    (target?: string, initialMode: AuthModalMode = 'sign-in') => {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setNextTarget(target);
      setMode(initialMode);
      setOpen(true);
    },
    [],
  );

  const closeModal = React.useCallback(() => setOpen(false), []);

  return (
    <AuthModalContext.Provider value={openModal}>
      {_copy(children)}
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          className="max-h-[90vh] max-w-[34rem] gap-0 overflow-y-auto rounded-[20px] border-border/70 p-6 shadow-xl shadow-primary/15 sm:p-9"
          dir="rtl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <DialogTitle className="sr-only">
            {_copy(
              mode === 'sign-in'
                ? 'Sign in to SANAD'
                : 'Create your SANAD account',
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {_copy(
              mode === 'sign-in'
                ? 'Enter your email and verification code to continue.'
                : 'Enter your details to create a customer account.',
            )}
          </DialogDescription>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-accent"
          />
          <div dir="ltr">
            {mode === 'sign-in' ? (
              <SignInFlow
                nextTarget={nextTarget}
                onComplete={closeModal}
                onSwitchToSignUp={() => setMode('sign-up')}
              />
            ) : (
              <SignUpFlow
                nextTarget={nextTarget}
                onComplete={closeModal}
                onSwitchToSignIn={() => setMode('sign-in')}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = React.useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used inside AuthModalProvider');
  }
  return context;
}
