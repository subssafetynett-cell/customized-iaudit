#!/bin/sh

echo "============================================"
echo "[start] DATABASE_URL host: $(echo $DATABASE_URL | sed 's|.*@||' | cut -d/ -f1)"
echo "============================================"

echo "[start] Applying database schema…"
if npx prisma migrate deploy; then
  echo "[start] Migrations applied successfully"
else
  echo "[start] migrate deploy failed — trying prisma db push (full schema sync)…"
  if npx prisma db push --accept-data-loss; then
    echo "[start] db push applied successfully"
  else
    echo "[start] WARNING: db push also failed — schema may be out of sync!"
  fi
fi

echo "[start] Ensuring super admin account…"
node scripts/ensure-superadmin.js || echo "[start] super-admin seed failed — continuing"

echo "[start] Starting API on port 3001"
exec node src/index.js
