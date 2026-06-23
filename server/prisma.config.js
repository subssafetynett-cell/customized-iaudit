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

/** Host CLI cannot use host.docker.internal; keep self-contained for prisma.config (Docker build runs before src/ is copied). */
function resolveDatabaseUrl(rawUrl) {
    const explicitOverride = process.env.DATABASE_URL_HOST?.trim();
    if (
        explicitOverride?.startsWith("postgresql://") ||
        explicitOverride?.startsWith("postgres://")
    ) {
        return explicitOverride;
    }

    const url = rawUrl?.trim();
    if (!url) return url;

    const inDocker =
        process.env.RUNNING_IN_DOCKER === "1" || existsSync("/.dockerenv");
    if (inDocker) return url;

    return url.replace(/host\.docker\.internal/gi, "localhost");
}

function normalizeDatabaseUrl(rawUrl) {
    const url = rawUrl?.trim();
    if (!url) return url;

    try {
        const parsed = new URL(url);
        parsed.searchParams.delete("channel_binding");
        return parsed.toString();
    } catch {
        return url
            .replace(/([?&])channel_binding=[^&]*&?/gi, "$1")
            .replace(/[?&]$/, "");
    }
}

const databaseUrl = normalizeDatabaseUrl(resolveDatabaseUrl(process.env.DATABASE_URL));
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
