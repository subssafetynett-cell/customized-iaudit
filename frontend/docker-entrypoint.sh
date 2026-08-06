#!/bin/sh
set -e

# Always start nginx immediately so the SPA (and Coolify/proxy health checks)
# work even when the API or database is still starting or temporarily down.
# Never block on API readiness — a hung upstream here caused public Gateway Timeout.

echo "[frontend] Starting nginx immediately (API readiness is not required)"
exec nginx -g "daemon off;"
