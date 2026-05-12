import { defineConfig } from "@prisma/config";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load nearest `.env` files walking up from `startDir` (max `maxDepth` levels).
 * Uses `override: true` so values from files replace empty placeholders in the shell (e.g. `DATABASE_URL=`).
 */
function loadEnvFilesUpwards(startDir, maxDepth = 6) {
    let dir = resolve(startDir);
    const loaded = new Set();
    for (let i = 0; i < maxDepth; i++) {
        const envPath = join(dir, ".env");
        if (existsSync(envPath) && !loaded.has(envPath)) {
            loaded.add(envPath);
            loadEnv({ path: envPath, override: true });
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvFilesUpwards(process.cwd());
loadEnvFilesUpwards(__dirname);

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
    throw new Error(
        "DATABASE_URL is not set after loading .env files. Put DATABASE_URL in `.env` at the project root or in `server/.env`, then run Prisma from `server/` (e.g. `cd server && npx prisma generate`). If it is already in `.env`, check for a UTF-8 BOM on the first line, spaces around `=`, or an empty `DATABASE_URL` exported in your shell (run `unset DATABASE_URL`)."
    );
}

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: databaseUrl
    }
});
