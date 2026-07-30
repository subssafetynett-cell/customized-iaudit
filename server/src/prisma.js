import pkgPg from 'pg';
const { Pool } = pkgPg;
import { PrismaPg } from '@prisma/adapter-pg';
import pkgPrisma from '../generated/prisma/index.js';
import { loadServerEnv } from './loadEnv.js';
import { buildPgPoolConfig } from './pgPoolConfig.js';
import { prepareDatabaseUrl } from './resolveDatabaseUrl.js';
loadServerEnv();

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
        message: error.message,
        code: error.code,
        meta: error.meta,
    });
};

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

export { pool };
export default prisma;
