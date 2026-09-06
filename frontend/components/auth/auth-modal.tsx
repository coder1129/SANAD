'use client';

import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

import { SignInFlow } from './sign-in-flow';

type OpenAuthModal = (next?: string) => void;

const AuthModalContext = React.createContext<OpenAuthModal | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [nextTarget, setNextTarget] = React.useState<string>();
  const [open, setOpen] = React.useState(false);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  const openModal = React.useCallback((target?: string) => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setNextTarget(target);
    setOpen(true);
  }, []);

  const closeModal = React.useCallback(() => setOpen(false), []);

  return (
    <AuthModalContext.Provider value={openModal}>
      {children}
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          className="max-w-[31rem] gap-0 rounded-[20px] border-border/70 p-6 shadow-xl shadow-primary/15 sm:p-9"
          dir="rtl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <DialogTitle className="sr-only">Sign in to SANAD</DialogTitle>
          <DialogDescription className="sr-only">
            Enter your email and verification code to continue.
          </DialogDescription>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-accent"
          />
          <div dir="ltr">
            <SignInFlow nextTarget={nextTarget} onComplete={closeModal} />
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
