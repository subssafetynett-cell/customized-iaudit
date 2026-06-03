import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(serverRoot, ".env");

let loaded = false;

/** Load `server/.env` only (single source of truth for this project). */
export function loadServerEnv() {
    if (loaded) return;
    if (existsSync(envPath)) {
        loadEnv({ path: envPath });
    }
    loaded = true;
}

export const serverEnvPath = envPath;
