/**
 * Run `prisma migrate deploy` without blocking the Node.js event loop.
 * spawnSync was previously used during bootstrap and froze HTTP (health + APIs)
 * for the full migration duration → Traefik/nginx 504 Gateway Timeout.
 */
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function runCommand(command, args, { cwd, env } = {}) {
    return new Promise((resolvePromise) => {
        const child = spawn(command, args, {
            cwd,
            env,
            shell: true,
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
            const text = chunk.toString();
            stdout += text;
            process.stdout.write(text);
        });
        child.stderr.on("data", (chunk) => {
            const text = chunk.toString();
            stderr += text;
            process.stderr.write(text);
        });
        child.on("error", (err) => {
            resolvePromise({
                status: 1,
                stdout,
                stderr: `${stderr}\n${err.message}`,
            });
        });
        child.on("close", (code) => {
            resolvePromise({
                status: code ?? 1,
                stdout,
                stderr,
            });
        });
    });
}

/**
 * @param {string} [databaseUrl]
 * @returns {Promise<{ status: number, stdout: string, stderr: string, output: string }>}
 */
export async function runPrismaMigrateDeploy(databaseUrl = process.env.DATABASE_URL) {
    const result = await runCommand("npx", ["prisma", "migrate", "deploy"], {
        cwd: serverRoot,
        env: {
            ...process.env,
            ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
        },
    });
    return {
        ...result,
        output: `${result.stdout || ""}\n${result.stderr || ""}`,
    };
}
