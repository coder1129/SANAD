'use client';

import { useMemo } from 'react';

import {
  changePassword,
  hasRole,
  isAdmin,
  login,
  logout,
  register,
} from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';
import type {
  AuthMessageResult,
  AuthStatus,
  ChangePasswordInput,
  LoginCredentials,
  LoginResult,
  RegisterInput,
  RegisterResult,
  User,
  UserRole,
} from '@/types/domain';

export interface UseAuthResult {
  /** The backend-confirmed identity, or `null` when there is none. */
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  /** The session is still being restored; render neither branch yet. */
  isInitializing: boolean;
  isAnonymous: boolean;
  /** `admin` or `super_admin`. A UX guard, not an authorization decision. */
  isAdmin: boolean;
  hasRole: (roles: UserRole | readonly UserRole[]) => boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  /** Resolves to `verification-required` when the account cannot sign in yet. */
  register: (input: RegisterInput) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  /** Succeeds only by ending the session: the backend invalidates every token. */
  changePassword: (input: ChangePasswordInput) => Promise<AuthMessageResult>;
}

/**
 * The application's access to the session.
 *
 * Everything a component legitimately needs, and nothing it does not: token
 * holders, interceptors, and the bootstrap stay out of reach, so no feature can
 * read a token or start its own refresh.
 *
 * `status` and `user` are selected individually rather than as one object, which
 * keeps each snapshot referentially stable — a selector returning a fresh object
 * every render is what makes a Zustand store re-render in a loop.
 */
export function useAuth(): UseAuthResult {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  return useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isInitializing: status === 'initializing',
      isAnonymous: status === 'anonymous',
      isAdmin: isAdmin(user),
      hasRole: (roles: UserRole | readonly UserRole[]) => hasRole(user, roles),
      login,
      register,
      logout,
      changePassword,
    }),
    [status, user],
  );
}
