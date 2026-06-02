import { defineConfig } from "@prisma/config";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = dirname(fileURLToPath(import.meta.url));
const envPath = join(serverRoot, ".env");

if (existsSync(envPath)) {
    loadEnv({ path: envPath });
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
    throw new Error(
        "DATABASE_URL is not set. Add it to server/.env (your local safetynet_db URL).",
    );
}

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: databaseUrl,
    },
});
