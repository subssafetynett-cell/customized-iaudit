/**
 * Run `prisma migrate deploy` using DATABASE_URL from server/.env.
 * Auto-baselines existing databases that hit P3005 (created via db push).
 */
import { spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { baselineExistingDatabase } from "./baseline-migrations.js";
import { loadServerEnv } from "../src/loadEnv.js";
import {
    isLocalDatabaseHost,
    parseDatabaseEndpoint,
    resolveDatabaseUrl,
} from "../src/resolveDatabaseUrl.js";

function probeTcp(host, port, timeoutMs = 2000) {
    return new Promise((resolveProbe) => {
        const socket = createConnection({ host, port });
        const done = (ok) => {
            socket.destroy();
            resolveProbe(ok);
        };
        socket.setTimeout(timeoutMs);
        socket.on("connect", () => done(true));
        socket.on("timeout", () => done(false));
        socket.on("error", () => done(false));
    });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(__dirname, "..");

loadServerEnv();

const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL?.trim());
if (!databaseUrl) {
    console.error(
        "[db:migrate] DATABASE_URL is not set (use server/.env locally or env_file in Docker)",
    );
    process.exit(1);
}

console.log(
    `[db:migrate] Target: ${databaseUrl.replace(/:([^:@/]+)@/, ":***@")}`,
);

const { host: dbHost, port: dbPort } = parseDatabaseEndpoint(databaseUrl);

if (isLocalDatabaseHost(dbHost)) {
    if (!(await probeTcp(dbHost, dbPort))) {
        console.error(
            `\n[db:migrate] Cannot reach PostgreSQL at ${dbHost}:${dbPort}.`,
        );
        console.error(
            "  Start Postgres (e.g. docker compose up -d postgres or audit-postgres), then run again.",
        );
        console.error(
            "  From your Mac, use localhost in DATABASE_URL — host.docker.internal only works inside Docker.\n",
        );
        process.exit(1);
    }
} else {
    console.log(`[db:migrate] Remote database host ${dbHost}:${dbPort} — skipping local TCP probe`);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: serverRoot,
    stdio: "pipe",
    encoding: "utf-8",
    env: { ...process.env, DATABASE_URL: databaseUrl },
    shell: true,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status === 0) {
    process.exit(0);
}

const output = `${result.stdout || ""}\n${result.stderr || ""}`;
if (/P3005/.test(output)) {
    console.warn(
        "[db:migrate] Database has no migration history (P3005) — baselining…",
    );
    try {
        baselineExistingDatabase(databaseUrl);
        process.exit(0);
    } catch (error) {
        console.error("[db:migrate] Baseline failed:", error.message);
        process.exit(1);
    }
}

process.exit(result.status ?? 1);
