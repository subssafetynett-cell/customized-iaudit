#!/bin/sh
set -e

# Always start nginx immediately so the SPA (and Coolify/proxy health checks)
# work even when the API or database is still starting or temporarily down.
# API failures are handled by nginx proxy timeouts / the client — never gate the UI.

API_HOST="${API_HOST:-server}"
API_PORT="${API_PORT:-3001}"
HEALTH_URL="http://${API_HOST}:${API_PORT}/health"

echo "[frontend] Starting nginx (API health is optional: ${HEALTH_URL})"
if wget -qO- "$HEALTH_URL" 2>/dev/null | grep -q '"database":"connected"'; then
  echo "[frontend] API is healthy"
else
  echo "[frontend] API not ready yet — serving SPA anyway"
fi

exec nginx -g "daemon off;"
