#!/bin/sh

echo "============================================"
echo "[start] DATABASE_URL host: $(echo $DATABASE_URL | sed 's|.*@||' | cut -d/ -f1)"
echo "============================================"

# -----------------------------------------------------------------------
# Start the Node API FIRST so the port is open immediately.
# Migrations, seeding, and schema patches run inside index.js on startup.
# This eliminates the 502 window where nothing listens on port 3001.
# -----------------------------------------------------------------------
echo "[start] Starting API on port ${PORT:-3001}"
exec node src/index.js
