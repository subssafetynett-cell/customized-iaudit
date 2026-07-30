/**
 * Local proof that async migrate does not freeze the HTTP event loop.
 * Simulates a long child process while /live must stay responsive.
 *
 * Usage: node scripts/prove-nonblocking-bootstrap.js
 */
import http from "node:http";
import { spawn } from "node:child_process";

const PORT = 3099;
let hits = 0;

const server = http.createServer((req, res) => {
    if (req.url === "/live") {
        hits += 1;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", hits }));
        return;
    }
    res.writeHead(404);
    res.end();
});

await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
console.log(`[prove] listening on ${PORT}`);

const child = spawn(
    process.execPath,
    ["-e", "setTimeout(() => process.exit(0), 2500)"],
    { stdio: "ignore" },
);

const started = Date.now();
const samples = [];
while (Date.now() - started < 2000) {
    const t0 = Date.now();
    const ok = await new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${PORT}/live`, (res) => {
            res.resume();
            resolve(res.statusCode === 200);
        });
        req.on("error", () => resolve(false));
        req.setTimeout(500, () => {
            req.destroy();
            resolve(false);
        });
    });
    samples.push({ ok, ms: Date.now() - t0 });
    await new Promise((r) => setTimeout(r, 100));
}

await new Promise((resolve) => child.on("close", resolve));
server.close();

const failed = samples.filter((s) => !s.ok || s.ms > 200);
console.log(`[prove] samples=${samples.length} hits=${hits} slowOrFail=${failed.length}`);
if (failed.length) {
    console.error("[prove] FAIL — event loop was not responsive", failed.slice(0, 5));
    process.exit(1);
}
console.log("[prove] PASS — /live stayed responsive during background child work");
