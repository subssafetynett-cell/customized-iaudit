# Docker Commands Guide for IAudit

This guide lists common Docker commands and **required Coolify / Traefik settings** to avoid 502/504 Gateway errors on Hostinger VPS.

## Gateway timeouts — required Coolify settings

Apply these in the Coolify UI for the **frontend** (public) service. Do **not** only raise proxy timeouts — the app fixes the root causes, but misconfigured health checks recreate outages.

### 1. Public health check (critical)

| Setting | Value |
|--------|--------|
| Health check path | `/nginx-health` |
| Health check port | `80` (frontend) |
| Interval | `10s` |
| Timeout | `3s` |
| Retries | `5` |

**Never** point Coolify/Traefik health checks at:

- Backend port `3001`
- `/api/health` or proxied API readiness through the public hostname during edge checks

Public `/health` on nginx is edge liveness only (always fast). Deep readiness is `/health/ready` (proxies to API) for monitoring.

### 2. Which service is public?

- **Expose / domain**: attach your domain to the **frontend** service (port 80).
- Backend (`server:3001`) must stay **internal** on the Docker network (already `expose` only in compose).

### 3. Traefik timeouts (only if needed)

Default Traefik ~60s is fine once the event-loop block is fixed. If you still see rare 504s on large uploads/exports only, set these **custom labels** on the frontend service (Coolify → Labels):

```
traefik.http.services.<SERVICE>.loadbalancer.server.scheme=http
traefik.http.services.<SERVICE>.loadbalancer.healthcheck.path=/nginx-health
traefik.http.services.<SERVICE>.loadbalancer.healthcheck.interval=10s
traefik.http.services.<SERVICE>.loadbalancer.healthcheck.timeout=3s
traefik.http.middlewares.iaudit-buffering.buffering.maxRequestBodyBytes=52428800
```

Replace `<SERVICE>` with Coolify’s generated Traefik service name (from the service’s Traefik labels panel).

Do **not** set multi-minute read timeouts to hide hung Node processes.

### 4. Hostinger VPS

| Check | Recommendation |
|------|----------------|
| RAM | ≥ 2 GB free for app + Postgres + Coolify (OOM kills → random 502) |
| Swap | 1–2 GB if VPS is ≤ 2 GB RAM |
| Disk | Keep ≥ 15% free (full disk → Postgres/container failures) |
| Postgres `max_connections` | Leave headroom; app pool default `PG_POOL_MAX=10` |

### 5. After redeploy — verify

```bash
# Edge (must be instant, never hang)
curl -sS https://YOUR_DOMAIN/nginx-health
curl -sS https://YOUR_DOMAIN/health

# API readiness (may be 503 for a few seconds during migrate)
curl -sS https://YOUR_DOMAIN/health/ready
curl -sS https://YOUR_DOMAIN/api/health
```

---

## Basic Orchestration

### Start the application
Starts all services in detached mode (background).
```bash
docker compose up -d
```

### Build and Start
Rebuilds images (useful after code changes) and starts the containers.
```bash
docker compose up -d --build
```

### Stop and Remove Containers
Stops the services and removes the containers, networks, and images defined in the compose file.
```bash
docker compose down
```

### Stop Containers
Stops the services without removing the containers.
```bash
docker compose stop
```

### Start Stopped Containers
```bash
docker compose start
```

---

## Monitoring and Debugging

### Check Container Status
```bash
docker compose ps
```

### View Logs
```bash
docker compose logs -f
docker compose logs -f server
```

Look for:
- `[start] ✔ Listening on 0.0.0.0:3001` within ~1–2s of container start
- `[bootstrap] ✔ All startup tasks complete in …ms`
- Absence of long stalls with no log lines while `/health` hangs (that was the old `spawnSync` migrate bug)

### Execute Command in Container
```bash
docker compose exec server sh
docker compose exec server env
```

---

## Maintenance

```bash
docker compose up -d --build server
docker system prune
```

---

## Prisma Specific (Inside Container)

```bash
docker compose exec server npx prisma db push
docker compose exec server npx prisma generate
```
