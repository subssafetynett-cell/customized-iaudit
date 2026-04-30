import pkgPg from 'pg';
const { Pool } = pkgPg;
import { PrismaPg } from '@prisma/adapter-pg';
import pkgPrisma from '../generated/prisma/index.js';
import dotenv from 'dotenv';
dotenv.config();

const { PrismaClient } = pkgPrisma;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15000, // 15 seconds
    max: 2, // Aggressively limit to 2 for testing/RDS limits
    idleTimeoutMillis: 10000 // 10 seconds idle timeout
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { pool };
export default prisma;
