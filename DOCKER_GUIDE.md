# Docker Commands Guide for IAudit

This guide lists common Docker commands and **required Coolify / Traefik settings** to avoid 502/504 Gateway errors on Hostinger VPS.

## Gateway Timeout after every redeploy (fix this first)

If `https://beta.iaudit.global` (or any domain) shows a black **"Gateway Timeout"** page after Coolify redeploy, Traefik cannot reach the container. The usual causes:

### 1. Custom Docker networks in `docker-compose.yaml` (most common)

Coolify docs: **Do not define custom `networks:`** in compose.

Custom networks put each container on two bridges. Traefik only sits on Coolify’s network, but Docker DNS may return the *other* IP → hang / **504 Gateway Timeout**. This often appears after every redeploy.

Our compose file must **not** include a top-level `networks:` block (already removed). If you re-add one, the outage returns.

### 2. Coolify UI — public service health check

Apply these on the **frontend** service (the one with the domain), not the API:

| Setting | Value |
|--------|--------|
| Health check path | `/nginx-health` |
| Health check port | `80` |
| Interval | `5–10s` |
| Timeout | `3s` |
| Retries | `5–6` |
| Expected status | `200` |

**Never** point Coolify/Traefik edge health checks at:

- Backend port `3001`
- `/api/health` or `/health/ready` (those wait on DB / bootstrap)

### 3. Which service gets the domain?

- Attach `beta.iaudit.global` (etc.) to the **frontend** service, port **80**.
- Keep `server:3001` **internal** (`expose` only — no public port).

### 4. After changing compose / health settings

1. Save the Coolify application settings.
2. Redeploy (force rebuild if the compose file changed).
3. Verify:

```bash
# Must be instant (edge liveness)
curl -sS https://YOUR_DOMAIN/nginx-health
curl -sS https://YOUR_DOMAIN/health

# API readiness (may be 503 for a few seconds during migrate — site HTML still works)
curl -sS https://YOUR_DOMAIN/health/ready
curl -sS https://YOUR_DOMAIN/api/health
```

If `/nginx-health` works but the homepage still 504s, restart **coolify-proxy** once on the VPS (`docker restart coolify-proxy`) so Traefik reloads routes — then redeploy again; with custom networks removed this should not recur.

---

## Traefik timeouts (only if needed)

Default Traefik ~60s is fine once networking/health are correct. If you still see rare 504s on large uploads/exports only, set these **custom labels** on the frontend service (Coolify → Labels):

```
traefik.http.services.<SERVICE>.loadbalancer.server.scheme=http
traefik.http.services.<SERVICE>.loadbalancer.healthcheck.path=/nginx-health
traefik.http.services.<SERVICE>.loadbalancer.healthcheck.interval=10s
traefik.http.services.<SERVICE>.loadbalancer.healthcheck.timeout=3s
traefik.http.middlewares.iaudit-buffering.buffering.maxRequestBodyBytes=52428800
```

Replace `<SERVICE>` with Coolify’s generated Traefik service name (from the service’s Traefik labels panel).

Do **not** set multi-minute read timeouts to hide hung Node processes.

---

## Hostinger VPS

| Check | Recommendation |
|------|----------------|
| RAM | ≥ 2 GB free for app + Postgres + Coolify (OOM kills → random 502) |
| Swap | 1–2 GB if VPS is ≤ 2 GB RAM |
| Disk | Keep ≥ 15% free (full disk → Postgres/container failures) |
| Postgres `max_connections` | Leave headroom; app pool default `PG_POOL_MAX=10` |

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
- `[bootstrap] ✔ Ready for traffic in …ms`
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
