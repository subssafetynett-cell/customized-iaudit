/**
 * Run `prisma migrate deploy` using DATABASE_URL from server/.env (local safetynet_db).
 */
import { spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function probeTcp(host, port, timeoutMs = 2000) {
    return new Promise((resolve) => {
        const socket = createConnection({ host, port });
        const done = (ok) => {
            socket.destroy();
            resolve(ok);
        };
        socket.setTimeout(timeoutMs);
        socket.on("connect", () => done(true));
        socket.on("timeout", () => done(false));
        socket.on("error", () => done(false));
    });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(__dirname, "..");
const envPath = join(serverRoot, ".env");

if (!existsSync(envPath)) {
    console.error("[db:migrate] Missing server/.env");
    process.exit(1);
}
loadEnv({ path: envPath });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
    console.error("[db:migrate] DATABASE_URL is not set in server/.env");
    process.exit(1);
}

console.log(
    `[db:migrate] Target: ${databaseUrl.replace(/:([^:@/]+)@/, ":***@")}`,
);

const hostMatch = databaseUrl.match(/@([^:/]+):(\d+)/);
const dbHost = hostMatch?.[1] ?? "localhost";
const dbPort = Number(hostMatch?.[2] ?? 5432);

if (!(await probeTcp(dbHost, dbPort))) {
    console.error(
        `\n[db:migrate] Cannot reach PostgreSQL at ${dbHost}:${dbPort}.`,
    );
    console.error("  Start your local Postgres (safetynet_db on port 5433), then run again.\n");
    process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: serverRoot,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
    shell: true,
});

process.exit(result.status ?? 1);
