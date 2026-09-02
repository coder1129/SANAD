/**
 * SANAD authentication engine.
 *
 * ```
 * UI (Phase 8+)
 *   → useAuth() / route guards
 *     → lib/auth  (session engine, token holders, roles, redirect safety)
 *       → lib/api  (Axios core, auth interceptors, authApi module)
 *         → NestJS /api/v1/auth
 * ```
 *
 * ## Token strategy
 *
 * The access token lives in a module variable and nowhere else, so it is gone
 * after a reload and unreachable through browser storage. The refresh token lives
 * in `sessionStorage`, because the current backend contract takes it in the body
 * of `POST /auth/refresh` and never sets a cookie — JavaScript has to be able to
 * read it. `sessionStorage` keeps it to one tab and clears it when that tab
 * closes.
 *
 * Neither token is ever written to `localStorage`, a cookie, a persisted store, a
 * URL, the query cache, or a log line.
 *
 * A `Secure; HttpOnly; SameSite` refresh cookie issued by the backend is the
 * correct long-term design and remains a future backend improvement. It would
 * remove the `sessionStorage` slot and, with it, the limitation below.
 *
 * ## Server-side limitation
 *
 * Because the refresh token is in `sessionStorage`, the server cannot see it: it
 * is not sent with document requests. Next.js Proxy (`proxy.ts`, formerly
 * `middleware.ts`), layouts, and Server Components therefore have no session to
 * inspect, and route protection here is client-side by necessity. This is a UX
 * boundary, not a security boundary — every protected endpoint is authorized
 * again by `JwtAuthGuard` and `RolesGuard` on the backend, which is what actually
 * keeps data safe. Putting the refresh token in a readable cookie to work around
 * this would trade a real security property for a rendering convenience, and is
 * deliberately not done.
 */
export {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from './access-token';
export {
  bootstrapAuthSession,
  changePassword,
  ensureAuthInterceptors,
  login,
  logout,
  refreshAuthSession,
  register,
} from './auth-session';
export {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from './refresh-token';
export {
  currentRelativeLocation,
  DEFAULT_REDIRECT_PATH,
  sanitizeRedirectPath,
  withNextParam,
} from './redirect';
export { hasRole, isAdmin, isCustomer, isSuperAdmin } from './roles';
