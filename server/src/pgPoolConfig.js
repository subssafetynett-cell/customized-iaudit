/**
 * Build node-pg Pool options. node-postgres does not apply `sslmode` from the URL
 * the way libpq does — RDS/managed Postgres often needs explicit `ssl`.
 */
export function shouldUsePgSsl(databaseUrl = process.env.DATABASE_URL) {
    if (!databaseUrl) return false;

    const sslEnv = (process.env.DATABASE_SSL || "").toLowerCase();
    if (sslEnv === "false" || sslEnv === "disable" || sslEnv === "0") return false;
    if (sslEnv === "true" || sslEnv === "require" || sslEnv === "1") return true;

    if (/sslmode=disable/i.test(databaseUrl)) return false;
    if (/sslmode=(require|verify-full|verify-ca|prefer|no-verify)/i.test(databaseUrl)) {
        return true;
    }

    // Managed Postgres hosts (RDS, Azure, etc.) typically require SSL.
    if (/\.rds\.amazonaws\.com/i.test(databaseUrl)) return true;
    if (/\.postgres\.database\.azure\.com/i.test(databaseUrl)) return true;
    if (/\.neon\.tech/i.test(databaseUrl)) return true;
    if (/\.supabase\.co/i.test(databaseUrl)) return true;

    return false;
}

export function buildPgPoolConfig() {
    const connectionString = process.env.DATABASE_URL;
    const config = {
        connectionString,
        // Fail fast under pressure so /health and requests don't hang → proxy 504.
        // Prefer failing a single request (~3s) over queuing until Coolify's gateway timeout.
        connectionTimeoutMillis: Number.parseInt(
            process.env.PG_CONNECTION_TIMEOUT_MS || "3000",
            10,
        ),
        // Default raised from 10 — per-request session auth + list queries starved easily under Coolify concurrency.
        // Override down via PG_POOL_MAX if Postgres max_connections is tight.
        max: Number.parseInt(process.env.PG_POOL_MAX || "25", 10),
        idleTimeoutMillis: Number.parseInt(process.env.PG_IDLE_TIMEOUT_MS || "20000", 10),
        allowExitOnIdle: false,
    };

    if (shouldUsePgSsl(connectionString)) {
        const strictSsl =
            /sslmode=(verify-full|verify-ca)/i.test(connectionString || "") ||
            (process.env.DATABASE_SSL || "").toLowerCase() === "verify";
        config.ssl = {
            rejectUnauthorized: strictSsl && process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
        };
    }

    return config;
}
