import prisma from './prisma.js';

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
 * Cluster-safe mutex: blocks until this email's OTP send slot is available (PostgreSQL).
 * Uses $executeRaw — pg_advisory_* returns void and cannot be read via $queryRaw in Prisma 7.
 */
export async function withPgOtpAdvisoryLock(normalizedEmail, fn) {
    await prisma.$executeRaw`SELECT pg_advisory_lock(hashtext(${normalizedEmail})::bigint)`;
    try {
        return await fn();
    } finally {
        await prisma.$executeRaw`SELECT pg_advisory_unlock(hashtext(${normalizedEmail})::bigint)`;
    }
}
