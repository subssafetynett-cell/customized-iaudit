import { Router } from 'express';
import { execSync } from 'node:child_process';
import prisma from '../prisma.js';

let bootstrapComplete = false;
let dbHealthy = false;
const startedAt = Date.now();
const APP_VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.0.0';
const HEALTH_DB_TIMEOUT_MS = Number.parseInt(process.env.HEALTH_DB_TIMEOUT_MS || '2000', 10);

export function withTimeout(promise, ms, label) {
    let timer;
    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        }),
    ]);
}

async function probeDatabase() {
    await withTimeout(prisma.$queryRaw`SELECT 1`, HEALTH_DB_TIMEOUT_MS, 'health DB probe');
}

function healthPayload(extra = {}) {
    return {
        status: extra.status || 'ok',
        database: extra.database || 'unknown',
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        version: APP_VERSION,
        bootstrapComplete,
        timestamp: new Date().toISOString(),
        ...extra,
    };
}

function liveHandler(req, res) {
    res.status(200).json(healthPayload({ status: 'ok', database: 'skipped' }));
}

export async function readinessHandler(req, res) {
    try {
        await probeDatabase();
        dbHealthy = true;
        const ready = bootstrapComplete;
        res.status(ready ? 200 : 503).json(healthPayload({
            status: ready ? 'ok' : 'starting',
            database: 'connected',
        }));
    } catch (error) {
        dbHealthy = false;
        console.error('[health] Database check failed:', error.message);
        res.status(503).json(healthPayload({
            status: 'degraded',
            database: 'unavailable',
            error: error.message,
        }));
    }
}

export async function apiHealthHandler(req, res) {
    try {
        await probeDatabase();
        dbHealthy = true;
        res.status(bootstrapComplete ? 200 : 503).json(healthPayload({
            status: bootstrapComplete ? 'ok' : 'starting',
            database: 'connected',
        }));
    } catch (error) {
        dbHealthy = false;
        res.status(503).json(healthPayload({
            status: 'degraded',
            database: 'unavailable',
            error: error.message,
        }));
    }
}

export function setBootstrapComplete(value) {
    bootstrapComplete = Boolean(value);
}

export function setDbHealthy(value) {
    dbHealthy = Boolean(value);
}

export function getBootstrapComplete() {
    return bootstrapComplete;
}

export function getDbHealthy() {
    return dbHealthy;
}

export function createHealthRouter() {
    const router = Router();
    router.get('/live', liveHandler);
    router.get('/health', readinessHandler);
    router.get('/', (req, res) => {
        res.send('AuditMate Backend is running.');
    });
    router.get('/admin/upgrade-db', (req, res) => {
        // Blocks the Node event loop via execSync → mass 504s. Disabled in production.
        if (process.env.NODE_ENV === 'production' || process.env.ALLOW_ADMIN_UPGRADE_DB !== 'true') {
            return res.status(403).send('Disabled. Use prisma migrate deploy in your release pipeline.');
        }
        try {
            console.log('Manual DB upgrade requested...');
            const outputPush = execSync('npx prisma db push --accept-data-loss', { encoding: 'utf-8' });
            const outputGen = execSync('npx prisma generate', { encoding: 'utf-8' });
            res.status(200).send(`<pre>Database Synchronized Successfully!\n\n${outputPush}\n\n${outputGen}\n\nServer is automatically restarting to load the new schema. Please wait 5 seconds and refresh your app!</pre>`);
            setTimeout(() => {
                console.log("Restarting process to apply Prisma schema...");
                process.exit(0);
            }, 1000);
        } catch (error) {
            console.error('Manual manual DB sync failed:', error);
            res.status(500).send(`<pre>Failed to synchronize database:\n\n${error.message}\n\n${error.stdout || ''}\n${error.stderr || ''}</pre>`);
        }
    });
    return router;
}
