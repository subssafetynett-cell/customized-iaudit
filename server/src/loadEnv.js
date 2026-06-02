import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Load nearest `.env` files walking up from `startDir` (max `maxDepth` levels).
 * Uses `override: true` so values from files replace empty placeholders in the shell.
 */
function loadEnvFilesUpwards(startDir, maxDepth = 6) {
    let dir = resolve(startDir);
    const loaded = new Set();
    for (let i = 0; i < maxDepth; i++) {
        const envPath = join(dir, '.env');
        if (existsSync(envPath) && !loaded.has(envPath)) {
            loaded.add(envPath);
            loadEnv({ path: envPath, override: true });
        }
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
}

export function loadServerEnv() {
    loadEnvFilesUpwards(process.cwd());
    loadEnvFilesUpwards(dirname(fileURLToPath(import.meta.url)));
}

loadServerEnv();
