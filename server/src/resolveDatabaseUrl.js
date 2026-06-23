import { existsSync } from "node:fs";

/** True when Node is running inside a Docker container. */
export function isRunningInDocker() {
    return process.env.RUNNING_IN_DOCKER === "1" || existsSync("/.dockerenv");
}

/**
 * Resolve DATABASE_URL for the current runtime.
 * - In Docker: keep host.docker.internal (reaches Postgres on the host / published port).
 * - On the host: rewrite host.docker.internal → localhost (host CLI cannot use that hostname).
 * - DATABASE_URL_HOST overrides for explicit host-side tooling.
 */
export function resolveDatabaseUrl(rawUrl = process.env.DATABASE_URL) {
    const explicitHost = process.env.DATABASE_URL_HOST?.trim();
    if (explicitHost) return explicitHost;

    const url = rawUrl?.trim();
    if (!url) return url;

    if (isRunningInDocker()) return url;

    return url.replace(/host\.docker\.internal/gi, "localhost");
}

/** Parse host/port from a Postgres connection URL (supports URLs without an explicit port). */
export function parseDatabaseEndpoint(databaseUrl) {
    try {
        const parsed = new URL(databaseUrl);
        return {
            host: parsed.hostname,
            port: parsed.port ? Number(parsed.port) : 5432,
        };
    } catch {
        const match = databaseUrl.match(/@([^:/@]+)(?::(\d+))?/);
        return {
            host: match?.[1] ?? "localhost",
            port: match?.[2] ? Number(match[2]) : 5432,
        };
    }
}

export function isLocalDatabaseHost(host) {
    const normalized = host.toLowerCase();
    return (
        normalized === "localhost" ||
        normalized === "127.0.0.1" ||
        normalized === "host.docker.internal" ||
        normalized === "postgres"
    );
}
