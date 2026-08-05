/**
 * Build node-pg Pool options.
 *
 * Important: a bare `new Client({ connectionString })` must behave the same as this Pool.
 * If DATABASE_URL already has `sslmode=...`, do NOT also set `ssl:` — double SSL config
 * has caused RDS connect failures while a plain Client (URL-only) succeeded.
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

    // Managed Postgres hosts (RDS, Azure, etc.) typically require SSL when URL omits sslmode.
    if (/\.rds\.amazonaws\.com/i.test(databaseUrl)) return true;
    if (/\.postgres\.database\.azure\.com/i.test(databaseUrl)) return true;
    if (/\.neon\.tech/i.test(databaseUrl)) return true;
    if (/\.supabase\.co/i.test(databaseUrl)) return true;

    return false;
}

export function buildPgPoolConfig() {
    const connectionString = process.env.DATABASE_URL;
    const urlAlreadyHasSslMode = /(?:[?&]|^\s*)sslmode=/i.test(connectionString || "");

    const config = {
        connectionString,
        // Match bare Client default (0 = no artificial deadline). Set PG_CONNECTION_TIMEOUT_MS to cap.
        connectionTimeoutMillis: Number.parseInt(
            process.env.PG_CONNECTION_TIMEOUT_MS || "0",
            10,
        ),
        max: Number.parseInt(process.env.PG_POOL_MAX || "25", 10),
        idleTimeoutMillis: Number.parseInt(process.env.PG_IDLE_TIMEOUT_MS || "20000", 10),
        allowExitOnIdle: false,
    };

    // Only inject ssl when the URL does not already specify sslmode (same path as working Client test).
    if (!urlAlreadyHasSslMode && shouldUsePgSsl(connectionString)) {
        const strictSsl =
            (process.env.DATABASE_SSL || "").toLowerCase() === "verify" ||
            process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";
        config.ssl = {
            rejectUnauthorized: strictSsl,
        };
    }

    return config;
}
