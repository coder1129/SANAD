/**
 * Sentry instrumentation.
 *
 * Imported as the very first module in main.ts so the SDK can patch runtime
 * internals before Nest, Express, or Prisma are loaded. dotenv is loaded here
 * too because ConfigModule has not run yet at this point.
 *
 * No-op when SENTRY_DSN is unset, and every Sentry.* call elsewhere in the
 * codebase is a no-op when the SDK was never initialised.
 */
import 'dotenv/config';
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  const environment =
    process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: isProduction ? 0.1 : 1,
    // Never ship request bodies, headers, or user identifiers to Sentry:
    // this API handles credentials and payment payloads.
    sendDefaultPii: false,
  });
}

export const sentryEnabled = Boolean(dsn);
