# SANAD production runbook

## What is already automated

- The production image runs `prisma migrate deploy` before starting the API.
- The container runs as an unprivileged user, drops Linux capabilities, blocks
  privilege escalation, rotates Docker logs, and has liveness/readiness probes.
- Production validation rejects insecure secrets, HTTP frontend/CORS origins,
  enabled Swagger, incomplete R2 storage, missing email delivery, and the mock
  payment provider. `PAYMENT_PROVIDER=manual` enables reconciled external
  payments without exposing card or Apple Pay checkout to customers.

## Before every deployment

```bash
npm ci
npm run test:all
npm run build
NODE_ENV=production npm run preflight
npm run db:backup
```

Use `.env.production.example` as a checklist and store filled values in the
hosting provider's secret manager. Never upload `.env` to source control.

Deploy immutable image tags such as the commit SHA, not `latest`. Keep the
previous known-good image tag available for application rollback.

For a Docker Compose deployment, copy `.env.production.example` to an
untracked `.env.production`, fill it from the secret manager, then run:

```bash
docker compose --env-file .env.production \
  -f docker-compose.yml -f docker-compose.production.yml \
  up -d --build
```

The production override forces `NODE_ENV=production`, disables Swagger, makes
the API filesystem read-only, and provides only a small temporary `/tmp` mount.

## Staging smoke test

After deployment, and before directing customer traffic:

```bash
STAGING_BASE_URL=https://staging-api.example.com npm run staging:smoke
```

This checks liveness, readiness, public catalog/checkout, security headers,
disabled order-file routes, and disabled Swagger.

## Staging load test

Install k6 on the machine running the test. Use a staging database and R2
bucket, never production. A single k6 host shares one client IP, so increase
`THROTTLE_LIMIT` on staging for the test window and restore it afterwards.

```bash
STAGING_BASE_URL=https://staging-api.example.com \
LOAD_TEST_PACKAGE_ID=1 LOAD_VUS=10 LOAD_DURATION=60s \
npm run load:staging
```

The test fails when more than 1% of requests fail, p95 exceeds 750 ms, or p99
exceeds 1500 ms. Increase the load in steps (10, 25, 50 users) and monitor API
CPU/memory, PostgreSQL connections, database latency, and error logs.

## Backup and restore drill

`pg_dump`, `pg_restore`, and `psql` must be installed and match the PostgreSQL
server major version. `npm run db:backup` creates a compressed custom dump and
a SHA-256 checksum in `BACKUP_DIR` (defaults to `./backups`). Copy both to
encrypted off-site storage with retention rules.

Restore drills deliberately refuse to target `DATABASE_URL`. Create a separate
empty database and run:

```bash
RESTORE_DATABASE_URL=postgresql://user:password@host:5432/sanad_restore_test \
RESTORE_CONFIRM=restore-test-database \
npm run db:restore:check -- backups/sanad_db-TIMESTAMP.dump
```

Run the drill after the first production backup and at least monthly. A backup
is not proven until this command completes successfully.

## Rollback

1. Stop new traffic or put the site in maintenance mode.
2. Preserve logs and take a database backup if the database is healthy.
3. Redeploy the previous immutable application image tag.
4. Do not manually delete Prisma migration rows or run destructive down SQL.
   Database changes are forward-only; ship a corrective migration when needed.
5. Run `npm run staging:smoke` against the restored service, then reopen traffic.

## External work still required

- Add real R2, email, Sentry, domain/TLS, and hosting secrets.
- Enable email verification after existing users are backfilled.
- For manual payments, train administrators to confirm an order only after the
  funds appear in the provider or bank account. If on-site checkout is enabled
  later, connect the contracted gateway and switch both backend and frontend
  checkout modes together.
- Configure scheduled encrypted backups and alerting in the hosting platform.
