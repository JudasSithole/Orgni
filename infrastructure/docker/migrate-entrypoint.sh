#!/bin/sh
set -e
echo "Verifying Postgres connectivity..."
if ! PGCONNECT_TIMEOUT=10 psql "$DATABASE_URL" -c 'SELECT 1;'; then
  echo "Postgres connectivity check failed — this is the real error drizzle-kit was hiding."
  sleep 30
  exit 1
fi
echo "Postgres reachable — proceeding with migration"
if ! pnpm --filter @workspace/db run migrate; then
  echo "Migration failed."
  sleep 30
  exit 1
fi
echo "Migration succeeded."
sleep 10
