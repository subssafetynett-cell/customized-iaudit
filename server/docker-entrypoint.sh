#!/bin/sh
set -e

echo "[start] Applying database schema…"
if npx prisma migrate deploy 2>/dev/null; then
  echo "[start] Migrations applied"
else
  echo "[start] migrate deploy skipped (e.g. P3005 on existing DB); syncing with prisma db push"
  npx prisma db push
fi

echo "[start] Ensuring super admin account…"
node scripts/ensure-superadmin.js

echo "[start] Starting API on port 3001"
exec node src/index.js
