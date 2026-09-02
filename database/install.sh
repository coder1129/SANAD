#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd -- "$SCRIPT_DIR/../backend" && pwd)"
cd "$BACKEND_DIR"

if [[ ! -f .env ]]; then
  echo "Missing backend/.env. Copy backend/.env.example to backend/.env and set secure values first." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js and npm are required." >&2
  exit 1
fi

npm install
npm run db:migrate
npx prisma generate

echo "Database migrations completed successfully."
echo "To create the first administrator, set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env, then run:"
echo "  npm run db:seed-admin"
