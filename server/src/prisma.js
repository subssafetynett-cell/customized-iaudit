import pkgPg from 'pg';
const { Pool } = pkgPg;
import { PrismaPg } from '@prisma/adapter-pg';
import pkgPrisma from '../generated/prisma/index.js';
import { loadServerEnv } from './loadEnv.js';
import { buildPgPoolConfig } from './pgPoolConfig.js';
import { prepareDatabaseUrl } from './resolveDatabaseUrl.js';
loadServerEnv();

const databaseUrl = prepareDatabaseUrl(process.env.DATABASE_URL);
if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl;
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
