/** Per-email FIFO queue — one OTP send at a time per address in this process. */
const otpSendQueues = new Map();

/**
 * Run `fn` after all prior OTP work for this email completes (same Node process).
 */
export function runOtpSendExclusive(normalizedEmail, fn) {
    const prev = otpSendQueues.get(normalizedEmail) ?? Promise.resolve();
    const job = prev.catch(() => {}).then(() => fn());
    otpSendQueues.set(normalizedEmail, job);
    return job.finally(() => {
        if (otpSendQueues.get(normalizedEmail) === job) {
            otpSendQueues.delete(normalizedEmail);
        }
    });
}

/**
 * Previously used session-level `pg_advisory_lock` via Prisma's connection pool.
 * That is unsafe: lock and unlock often run on different pooled connections, so the
 * lock stays held and the next invite/OTP for that email blocks forever → proxy 504/502.
 * In-process `runOtpSendExclusive` is sufficient for a single API container (Coolify).
 */
export async function withPgOtpAdvisoryLock(_normalizedEmail, fn) {
    return fn();
}
