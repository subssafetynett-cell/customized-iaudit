/**
 * Baseline an existing database that was created with db push (P3005).
 * 1. Sync schema with db push
 * 2. Mark all local migrations as already applied
 * 3. Run migrate deploy (applies any future migrations cleanly)
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = resolve(join(fileURLToPath(import.meta.url), "..", ".."));

export function listMigrationNames() {
    const migrationsDir = join(serverRoot, "prisma", "migrations");
    return readdirSync(migrationsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
}

function runPrisma(args, databaseUrl, { inherit = false } = {}) {
    return spawnSync("npx", ["prisma", ...args], {
        cwd: serverRoot,
        stdio: inherit ? "inherit" : "pipe",
        encoding: "utf-8",
        env: { ...process.env, DATABASE_URL: databaseUrl },
        shell: true,
    });
}

export function baselineExistingDatabase(databaseUrl) {
    console.log("[db:baseline] Syncing schema with prisma db push…");
    const push = runPrisma(["db", "push"], databaseUrl, { inherit: true });
    if (push.status !== 0) {
        throw new Error("prisma db push failed during baseline");
    }

    const migrations = listMigrationNames();
    console.log(`[db:baseline] Marking ${migrations.length} migrations as applied…`);

    for (const migration of migrations) {
        const resolved = runPrisma(
            ["migrate", "resolve", "--applied", migration],
            databaseUrl,
        );
        const output = `${resolved.stdout || ""}\n${resolved.stderr || ""}`;
        if (resolved.status !== 0 && !/already recorded as applied/i.test(output)) {
            process.stdout.write(resolved.stdout || "");
            process.stderr.write(resolved.stderr || "");
            throw new Error(`Failed to baseline migration: ${migration}`);
        }
        console.log(`[db:baseline]   ✓ ${migration}`);
    }

    console.log("[db:baseline] Running prisma migrate deploy…");
    const deploy = runPrisma(["migrate", "deploy"], databaseUrl, { inherit: true });
    if (deploy.status !== 0) {
        throw new Error("prisma migrate deploy failed after baseline");
    }

    console.log("[db:baseline] Database baselined successfully.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const { loadServerEnv } = await import("../src/loadEnv.js");
    const { resolveDatabaseUrl } = await import("../src/resolveDatabaseUrl.js");

    loadServerEnv();

    const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL?.trim());
    if (!databaseUrl) {
        console.error("[db:baseline] DATABASE_URL is not set");
        process.exit(1);
    }

    try {
        baselineExistingDatabase(databaseUrl);
    } catch (error) {
        console.error("[db:baseline] Failed:", error.message);
        process.exit(1);
    }
}
