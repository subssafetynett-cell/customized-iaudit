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
        connectionTimeoutMillis: Number.parseInt(
            process.env.PG_CONNECTION_TIMEOUT_MS || "30000",
            10,
        ),
        max: Number.parseInt(process.env.PG_POOL_MAX || "10", 10),
        idleTimeoutMillis: Number.parseInt(process.env.PG_IDLE_TIMEOUT_MS || "10000", 10),
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
