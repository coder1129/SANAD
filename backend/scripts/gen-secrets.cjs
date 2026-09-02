#!/usr/bin/env node
/**
 * Prints a fresh set of secrets for a new deployment.
 *
 * Every value is 32 random bytes rendered as hex, which satisfies the length
 * and entropy checks in src/config/env.validation.ts. Nothing is written to
 * disk: copy the lines you need into the target environment's secret store.
 *
 *   npm run gen:secrets
 */
const { randomBytes } = require('node:crypto');

const secret = () => randomBytes(32).toString('hex');

const values = {
  JWT_ACCESS_SECRET: secret(),
  JWT_REFRESH_SECRET: secret(),
  PAYMENT_WEBHOOK_SECRET: secret(),
};

process.stdout.write('# Generated secrets - store these in your secret manager\n');
process.stdout.write('# Never reuse values between environments.\n\n');
for (const [key, value] of Object.entries(values)) {
  process.stdout.write(`${key}=${value}\n`);
}
process.stdout.write(
  '\n# Reminder: production also needs DATABASE_URL, TRUST_PROXY, R2_* and\n# either SMTP_HOST or RESEND_API_KEY, or the app refuses to start.\n',
);
