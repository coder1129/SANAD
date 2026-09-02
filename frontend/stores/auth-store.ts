import { create } from 'zustand';

import type { AuthStatus, User } from '@/types/domain';

interface AuthState {
  status: AuthStatus;
  /**
   * The identity established by the backend (`GET /auth/me`, or the user object
   * returned by login/register). Held in memory only — a user object read back
   * from browser storage would be attacker-editable and is never trusted.
   */
  user: User | null;
}

interface AuthActions {
  setAuthenticatedUser: (user: User) => void;
  setAnonymous: () => void;
  setInitializing: () => void;
}

/**
 * Session state for the UI.
 *
 * Holds exactly what components need to decide what to render: the lifecycle
 * status and the current user. It deliberately holds no tokens — those live in
 * the access-token memory holder and the refresh-token session storage — and no
 * business data, which belongs in the query cache.
 *
 * No persistence middleware: rehydrating `authenticated` from storage would let
 * the browser claim an identity the backend never confirmed. Every reload starts
 * at `initializing` and the engine's bootstrap re-establishes the truth.
 */
export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  status: 'initializing',
  user: null,
  setAuthenticatedUser: (user) => set({ status: 'authenticated', user }),
  setAnonymous: () => set({ status: 'anonymous', user: null }),
  setInitializing: () => set({ status: 'initializing', user: null }),
}));
