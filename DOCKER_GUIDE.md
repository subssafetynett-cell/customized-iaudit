# Docker Commands Guide for IAudit

This guide provides a list of common Docker commands used to manage the IAudit application stack.

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
Stops the services without removing them.
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
Lists all containers and their current status (Up, Exited, etc.).
```bash
docker compose ps
```

### View Logs
Follow logs for all services:
```bash
docker compose logs -f
```

View logs for a specific service (e.g., server):
```bash
docker compose logs -f server
```

### Execute Command in Container
Open a shell inside the server container:
```bash
docker compose exec server sh
```

Check environment variables inside the server:
```bash
docker compose exec server env
```

---

## Maintenance

### Rebuild a Specific Service
```bash
docker compose up -d --build server
```

### Remove Unused Data
Removes stopped containers, unused networks, and dangling images.
```bash
docker system prune
```

To also remove unused volumes (CAUTION: this will delete your database data if the volume is not in use):
```bash
docker system prune -a --volumes
```

---

## Prisma Specific (Inside Container)

### Sync Database Schema
If you need to manually trigger a Prisma sync:
```bash
docker compose exec server npx prisma db push
```

### Generate Prisma Client
```bash
docker compose exec server npx prisma generate
```
