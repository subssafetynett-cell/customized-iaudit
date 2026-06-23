import pkgPg from 'pg';
const { Pool } = pkgPg;
import { PrismaPg } from '@prisma/adapter-pg';
import pkgPrisma from '../generated/prisma/index.js';
import { loadServerEnv } from './loadEnv.js';
import { buildPgPoolConfig } from './pgPoolConfig.js';
import { resolveDatabaseUrl } from './resolveDatabaseUrl.js';
loadServerEnv();

// Ensure pg pool uses the URL appropriate for this runtime (host vs container).
if (!process.env.DATABASE_URL_HOST) {
    const resolved = resolveDatabaseUrl(process.env.DATABASE_URL);
    if (resolved) process.env.DATABASE_URL = resolved;
}

const { PrismaClient } = pkgPrisma;

const pool = new Pool(buildPgPoolConfig());
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const handlePrismaError = (error, context) => {
    console.error(`[Prisma Error] ${context}:`, {
        message: error.message,
        code: error.code,
        meta: error.meta,
    });
};

export { pool };
export default prisma;
