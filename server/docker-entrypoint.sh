#!/bin/sh

echo "[start] Applying database schema…"
if npx prisma migrate deploy 2>/dev/null; then
  echo "[start] Migrations applied"
else
  echo "[start] migrate deploy skipped; trying prisma db push…"
  npx prisma db push --accept-data-loss || echo "[start] db push also failed — continuing anyway, server will retry on boot"
fi

echo "[start] Ensuring super admin account…"
node scripts/ensure-superadmin.js || echo "[start] super-admin seed failed — continuing"

echo "[start] Starting API on port 3001"
exec node src/index.js
