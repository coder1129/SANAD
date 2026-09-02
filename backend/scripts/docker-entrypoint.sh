#!/bin/sh
set -eu

echo "Validating production environment..."
node scripts/preflight.cjs

echo "Applying pending Prisma migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting SANAD API..."
exec node dist/main
