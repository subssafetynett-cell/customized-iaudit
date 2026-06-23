#!/bin/sh

echo "============================================"
echo "[start] DATABASE_URL host: $(echo $DATABASE_URL | sed 's|.*@||' | cut -d/ -f1)"
echo "============================================"

echo "[start] Applying database schema…"
if node scripts/run-migrate.js; then
  echo "[start] Migrations applied successfully"
else
  echo "[start] FATAL: database schema could not be applied — refusing to start API"
  exit 1
fi

echo "[start] Verifying database connectivity…"
node scripts/verify-database.js || exit 1

echo "[start] Ensuring super admin account…"
node scripts/ensure-superadmin.js || echo "[start] super-admin seed failed — continuing"

echo "[start] Starting API on port 3001"
exec node src/index.js
