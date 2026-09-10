#!/usr/bin/env node
/**
 * Runs the application's own environment validation without booting the server,
 * so a bad deployment config fails in CI or a deploy step instead of at runtime.
 *
 *   npm run build && npm run preflight
 *
 * Exits 0 when the environment is valid, 1 with the validation error otherwise.
 */
require('dotenv/config');
require('reflect-metadata');

const { existsSync } = require('node:fs');
const path = require('node:path');

const validationPath = path.join(
  __dirname,
  '..',
  'dist',
  'config',
  'env.validation.js',
);

if (!existsSync(validationPath)) {
  process.stderr.write(
    'Preflight needs a build first: run `npm run build`, then `npm run preflight`.\n',
  );
  process.exit(1);
}

const { validate } = require(validationPath);

try {
  const config = validate({
    ...process.env,
    ...(process.argv.includes('--production') && { NODE_ENV: 'production' }),
  });
  const nodeEnv = config.NODE_ENV;
  process.stdout.write(`Environment OK (NODE_ENV=${nodeEnv}).\n`);

  const notes = [];
  if (!config.SENTRY_DSN) {
    notes.push('SENTRY_DSN is unset - errors will only go to stdout logs.');
  }
  if (
    nodeEnv === 'production' &&
    config.REQUIRE_EMAIL_VERIFICATION !== 'true'
  ) {
    notes.push(
      'REQUIRE_EMAIL_VERIFICATION=false - enable it after existing customer emails are verified/backfilled.',
    );
  }
  if (!config.R2_ACCESS_KEY_ID && nodeEnv !== 'production') {
    notes.push('R2 credentials unset - uploads fall back to local disk.');
  }
  if (config.TRUST_PROXY === 'false' && nodeEnv === 'production') {
    notes.push(
      'TRUST_PROXY=false in production - correct only if nothing proxies this API.',
    );
  }
  if (config.PAYMENT_PROVIDER === 'bypass') {
    notes.push(
      'WARNING: PAYMENT_PROVIDER=bypass - orders are accepted without charging customers. Disable this before enabling paid checkout.',
    );
  }
  if (config.PAYMENT_PROVIDER === 'manual') {
    notes.push(
      'PAYMENT_PROVIDER=manual - customer checkout is disabled; admins must reconcile and confirm external payments.',
    );
  }
  for (const note of notes) {
    process.stdout.write(`  note: ${note}\n`);
  }
  process.exit(0);
} catch (error) {
  process.stderr.write(`Environment invalid:\n${error.message}\n`);
  process.exit(1);
}
