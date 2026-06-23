#!/bin/sh
set -e

API_HOST="${API_HOST:-server}"
API_PORT="${API_PORT:-3001}"
HEALTH_URL="http://${API_HOST}:${API_PORT}/health"
MAX_WAIT="${API_STARTUP_MAX_WAIT_SEC:-300}"

echo "[frontend] Waiting for API at ${HEALTH_URL} (max ${MAX_WAIT}s)..."

elapsed=0
while [ "$elapsed" -lt "$MAX_WAIT" ]; do
  if wget -qO- "$HEALTH_URL" 2>/dev/null | grep -q '"database":"connected"'; then
    echo "[frontend] API is healthy"
    exec nginx -g "daemon off;"
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

echo "[frontend] FATAL: API not healthy after ${MAX_WAIT}s"
exit 1
