/**
 * Adds User login timestamp columns when Prisma migrate used a different DATABASE_URL than the running server.
 * Usage: cd server && node scripts/apply-last-login-column.js
 */
import pg from "pg";
import { loadServerEnv } from "../src/loadEnv.js";

loadServerEnv();

const url = process.env.DATABASE_URL?.trim();
if (!url) {
    console.error("[apply-last-login-column] DATABASE_URL is not set in server/.env");
    process.exitCode = 1;
} else {
    const pool = new pg.Pool({ connectionString: url });
    try {
        await pool.query(
            'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)'
        );
        await pool.query(
            'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstLoginAt" TIMESTAMP(3)'
        );
        await pool.query(
            'UPDATE "User" SET "firstLoginAt" = "lastLoginAt" WHERE "firstLoginAt" IS NULL AND "lastLoginAt" IS NOT NULL'
        );
        console.log(`[apply-last-login-column] OK (lastLoginAt + firstLoginAt) on ${url.replace(/:[^:@/]+@/, ":****@")}`);
    } catch (err) {
        console.error("[apply-last-login-column] Failed:", err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}
