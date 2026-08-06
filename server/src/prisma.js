import pkgPg from 'pg';
const { Pool, Client } = pkgPg;
import { PrismaPg } from '@prisma/adapter-pg';
import dns from 'node:dns';
import pkgPrisma from '../generated/prisma/index.js';
import { loadServerEnv } from './loadEnv.js';
import { buildPgPoolConfig } from './pgPoolConfig.js';
import { prepareDatabaseUrl } from './resolveDatabaseUrl.js';
loadServerEnv();

// Node 17+ dual-stack DNS often yields AggregateError (IPv6 refuse + IPv4) for Postgres.
try {
    dns.setDefaultResultOrder('ipv4first');
} catch {
    /* older Node */
}

// DATABASE_URL_HOST full-URL override is for host-side CLI only — keep runtime pool on DATABASE_URL.
const databaseUrl = prepareDatabaseUrl(process.env.DATABASE_URL, {
    allowHostOverride: false,
});
if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl;
}

const { PrismaClient } = pkgPrisma;

const pool = new Pool(buildPgPoolConfig());

pool.on('error', (err) => {
    console.error('[pg Pool] Idle client error (will reconnect):', err.message);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const handlePrismaError = (error, context) => {
    console.error(`[Prisma Error] ${context}:`, {
        message: formatErrorDetail(error),
        code: error?.code,
        meta: error?.meta,
    });
};

/** Flatten AggregateError / nested cause for logs and API detail. */
export function formatErrorDetail(error, maxLen = 400) {
    if (error == null) return 'unknown';
    const parts = [];
    const walk = (err, depth = 0) => {
        if (!err || depth > 4) return;
        if (typeof err === 'string') {
            parts.push(err);
            return;
        }
        if (err.message) parts.push(String(err.message));
        if (err.code) parts.push(`code=${err.code}`);
        if (err.name === 'AggregateError' && Array.isArray(err.errors)) {
            for (const inner of err.errors.slice(0, 5)) walk(inner, depth + 1);
        }
        if (err.cause) walk(err.cause, depth + 1);
    };
    walk(error);
    const out = [...new Set(parts.filter(Boolean))].join(' | ') || String(error);
    return out.slice(0, maxLen);
}

/** Prisma 7 + driver adapter may surface unique violations without a top-level P2002. */
export function getPrismaErrorCode(error) {
    if (!error || typeof error !== 'object') return null;
    if (typeof error.code === 'string' && error.code) return error.code;
    const cause = error.cause;
    if (cause && typeof cause === 'object' && typeof cause.code === 'string' && cause.code) {
        return cause.code;
    }
    return null;
}

export function isPrismaUniqueViolation(error) {
    const code = getPrismaErrorCode(error);
    if (code === 'P2002' || code === '23505') return true;
    const msg = `${error?.message || ''} ${error?.cause?.message || ''}`;
    return /unique constraint|duplicate key value|P2002|\b23505\b/i.test(msg);
}

export function isPrismaForeignKeyViolation(error) {
    const code = getPrismaErrorCode(error);
    if (code === 'P2003' || code === '23503') return true;
    const msg = `${error?.message || ''} ${error?.cause?.message || ''}`;
    return /foreign key constraint|P2003|\b23503\b/i.test(msg);
}

/** Run a pool query with one retry — recovers from transient AggregateError / pool blips. */
export async function poolQueryWithRetry(text, params, retries = 1) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await pool.query(text, params);
        } catch (err) {
            lastErr = err;
            const msg = formatErrorDetail(err);
            const transient =
                err?.name === 'AggregateError' ||
                /ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|timeout|Connection terminated|too many clients/i.test(msg);
            if (!transient || attempt === retries) break;
            await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        }
    }
    // Last resort: same path as the working Coolify smoke test (fresh Client, URL-only).
    try {
        return await queryWithFreshClient(text, params);
    } catch {
        throw lastErr;
    }
}

/** One-shot Client using DATABASE_URL exactly like: new Client({ connectionString }) */
export async function queryWithFreshClient(text, params) {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        return await client.query(text, params);
    } finally {
        await client.end().catch(() => {});
    }
}

export { pool };
export default prisma;
