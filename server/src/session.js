import crypto from 'node:crypto';
import prisma, { pool } from './prisma.js';

/** Server-side session lifetime (opaque token stored in DB; delivered via httpOnly cookie). */
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Renew session when less than this much time remains (sliding window). */
const SESSION_RENEW_WHEN_REMAINING_MS = SESSION_MAX_AGE_MS / 2;
const SESSION_EXPIRES_HEADER = 'X-Session-Expires-At';
const SESSION_COOKIE_NAME = 'iaudit_session';

/** Ensures Session table + login columns exist even if bootstrap/migrate lagged. */
let loginSchemaReadyPromise = null;

async function ensureLoginSchemaReady() {
    if (!loginSchemaReadyPromise) {
        loginSchemaReadyPromise = (async () => {
            await pool.query(
                'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0'
            );
            await pool.query(
                'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)'
            );
            await pool.query(
                'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstLoginAt" TIMESTAMP(3)'
            );
            await pool.query(`
                CREATE TABLE IF NOT EXISTS "Session" (
                    "token" TEXT NOT NULL,
                    "userId" INTEGER NOT NULL,
                    "expiresAt" TIMESTAMP(3) NOT NULL,
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT "Session_pkey" PRIMARY KEY ("token")
                )
            `);
            await pool.query(
                `CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId")`
            );
            await pool.query(
                `CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt")`
            );
            await pool.query(`
                DO $$ BEGIN
                    ALTER TABLE "Session"
                        ADD CONSTRAINT "Session_userId_fkey"
                        FOREIGN KEY ("userId") REFERENCES "User"("id")
                        ON DELETE CASCADE ON UPDATE CASCADE;
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$
            `).catch(() => {});
            return true;
        })().catch((err) => {
            loginSchemaReadyPromise = null;
            throw err;
        });
    }
    return loginSchemaReadyPromise;
}

function safeDecodeCookieValue(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        // Malformed % sequences in any Cookie must not crash auth (login/session).
        return value;
    }
}

function parseRequestCookies(req) {
    const header = req.headers.cookie;
    if (!header || typeof header !== 'string') return {};
    return header.split(';').reduce((acc, part) => {
        const idx = part.indexOf('=');
        if (idx < 1) return acc;
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (key) acc[key] = safeDecodeCookieValue(value);
        return acc;
    }, {});
}

function sessionCookieSecure() {
    if (process.env.COOKIE_SECURE === 'true') return true;
    if (process.env.COOKIE_SECURE === 'false') return false;
    return process.env.NODE_ENV === 'production';
}

function serializeSessionCookie(token, maxAgeMs) {
    const maxAgeSeconds = Math.max(0, Math.floor(maxAgeMs / 1000));
    const secure = sessionCookieSecure();
    const parts = [
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
        'Path=/',
        `Max-Age=${maxAgeSeconds}`,
        'HttpOnly',
        'SameSite=Lax',
    ];
    if (secure) parts.push('Secure');
    return parts.join('; ');
}

function appendSessionCookie(res, token, sessionExpiresAtIso) {
    const ms = Date.parse(String(sessionExpiresAtIso)) - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return;
    res.append('Set-Cookie', serializeSessionCookie(token, ms));
}

function clearSessionCookie(res) {
    const secure = sessionCookieSecure();
    const parts = [
        `${SESSION_COOKIE_NAME}=`,
        'Path=/',
        'Max-Age=0',
        'HttpOnly',
        'SameSite=Lax',
    ];
    if (secure) parts.push('Secure');
    res.append('Set-Cookie', parts.join('; '));
}

function getSessionTokenFromRequest(req) {
    const fromCookie = parseRequestCookies(req)[SESSION_COOKIE_NAME];
    if (fromCookie) return fromCookie;
    const authHeader = req.headers.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim() || null;
    }
    return null;
}

function sendAuthenticatedSession(res, profile, session) {
    appendSessionCookie(res, session.token, session.sessionExpiresAt);
    res.setHeader(SESSION_EXPIRES_HEADER, session.sessionExpiresAt);
    return { ...profile, sessionExpiresAt: session.sessionExpiresAt };
}

/** Consecutive wrong passwords before login is blocked until password reset (env `LOGIN_MAX_FAILED_ATTEMPTS`, default 15, clamped 5–50). */
const LOGIN_MAX_FAILED_ATTEMPTS = Math.min(
    50,
    Math.max(5, Number.parseInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS || '15', 10) || 15)
);

/** Sliding window (ms) for per-IP login attempt cap (default 15 minutes). */
const LOGIN_IP_WINDOW_MS = Math.max(
    60_000,
    Number.parseInt(process.env.LOGIN_IP_WINDOW_MS || String(15 * 60 * 1000), 10) || 15 * 60 * 1000
);

/** Max POST /auth/login per IP per window (default 120). */
const LOGIN_IP_MAX_IN_WINDOW = Math.min(
    500,
    Math.max(20, Number.parseInt(process.env.LOGIN_IP_MAX_IN_WINDOW || '120', 10) || 120)
);

const loginIpBuckets = new Map();

function loginIpRateLimit(req, res, next) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ip = forwarded || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    let b = loginIpBuckets.get(ip);
    if (!b || now > b.resetAt) {
        b = { n: 0, resetAt: now + LOGIN_IP_WINDOW_MS };
        loginIpBuckets.set(ip, b);
    }
    b.n += 1;
    if (b.n > LOGIN_IP_MAX_IN_WINDOW) {
        const retryAfterSeconds = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
        res.setHeader('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
            error: 'Too many login attempts from this network. Please try again later.',
            retryAfterSeconds
        });
    }
    next();
}

const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

/** Per-email OTP send cooldown (survives parallel requests; complements DB check). */
const otpSendCooldownByEmail = new Map();
/** Emails with an OTP send currently in progress (blocks burst parallel API calls). */
const otpSendInFlight = new Set();

const OTP_SEND_IP_WINDOW_MS = Math.max(
    60_000,
    Number.parseInt(process.env.OTP_SEND_IP_WINDOW_MS || String(15 * 60 * 1000), 10) || 15 * 60 * 1000
);
const OTP_SEND_IP_MAX_IN_WINDOW = Math.min(
    100,
    Math.max(5, Number.parseInt(process.env.OTP_SEND_IP_MAX_IN_WINDOW || '15', 10) || 15)
);
const otpSendIpBuckets = new Map();

/** PSZL-009: sliding window for POST /auth/reset-password verification (default 1 hour). */
const RESET_PASSWORD_VERIFY_WINDOW_MS = Math.max(
    60_000,
    Number.parseInt(process.env.RESET_PASSWORD_VERIFY_WINDOW_MS || String(60 * 60 * 1000), 10) || 60 * 60 * 1000
);

/** Max reset-password verification attempts per IP per window (default 20). */
const RESET_PASSWORD_VERIFY_MAX_PER_IP = Math.min(
    100,
    Math.max(5, Number.parseInt(process.env.RESET_PASSWORD_VERIFY_MAX_PER_IP || '20', 10) || 20)
);

/** Max reset-password verification attempts per email per window (default 20). */
const RESET_PASSWORD_VERIFY_MAX_PER_EMAIL = Math.min(
    100,
    Math.max(5, Number.parseInt(process.env.RESET_PASSWORD_VERIFY_MAX_PER_EMAIL || '20', 10) || 20)
);

const resetPasswordVerifyIpBuckets = new Map();
const resetPasswordVerifyEmailBuckets = new Map();

function getClientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return forwarded || req.socket?.remoteAddress || 'unknown';
}

function throwOtpCooldownError(retryAfterSeconds) {
    const err = new Error('OTP_COOLDOWN');
    err.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    throw err;
}

/** Server-side OTP resend gate — must run before any await in sendOtpToEmailAddress. */
function acquireOtpSendSlot(normalizedEmail) {
    if (otpSendInFlight.has(normalizedEmail)) {
        throwOtpCooldownError(Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000));
    }
    const now = Date.now();
    const lastSent = otpSendCooldownByEmail.get(normalizedEmail);
    if (lastSent != null && now - lastSent < OTP_RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
        throwOtpCooldownError(remainingSeconds);
    }
    otpSendInFlight.add(normalizedEmail);
    otpSendCooldownByEmail.set(normalizedEmail, now);
}

function releaseOtpSendSlot(normalizedEmail) {
    otpSendInFlight.delete(normalizedEmail);
}

function sendOtpIpRateLimit(req, res, next) {
    const ip = getClientIp(req);
    const now = Date.now();
    let bucket = otpSendIpBuckets.get(ip);
    if (!bucket || now > bucket.resetAt) {
        bucket = { n: 0, resetAt: now + OTP_SEND_IP_WINDOW_MS };
        otpSendIpBuckets.set(ip, bucket);
    }
    bucket.n += 1;
    if (bucket.n > OTP_SEND_IP_MAX_IN_WINDOW) {
        const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        res.setHeader('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
            error: 'Too many verification code requests from this network. Please try again later.',
            retryAfterSeconds
        });
    }
    next();
}

/** Rate limit password-reset token verification (brute-force protection). */
function resetPasswordVerifyRateLimit(req, res, next) {
    const ip = getClientIp(req);
    const now = Date.now();

    let ipBucket = resetPasswordVerifyIpBuckets.get(ip);
    if (!ipBucket || now > ipBucket.resetAt) {
        ipBucket = { n: 0, resetAt: now + RESET_PASSWORD_VERIFY_WINDOW_MS };
        resetPasswordVerifyIpBuckets.set(ip, ipBucket);
    }
    ipBucket.n += 1;
    if (ipBucket.n > RESET_PASSWORD_VERIFY_MAX_PER_IP) {
        const retryAfterSeconds = Math.max(1, Math.ceil((ipBucket.resetAt - now) / 1000));
        res.setHeader('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
            error: 'Too many password reset attempts. Please try again later.',
            retryAfterSeconds
        });
    }

    const emailRaw = req.body?.email;
    if (typeof emailRaw === 'string') {
        const emailKey = emailRaw.toLowerCase().trim();
        if (emailKey) {
            let emailBucket = resetPasswordVerifyEmailBuckets.get(emailKey);
            if (!emailBucket || now > emailBucket.resetAt) {
                emailBucket = { n: 0, resetAt: now + RESET_PASSWORD_VERIFY_WINDOW_MS };
                resetPasswordVerifyEmailBuckets.set(emailKey, emailBucket);
            }
            emailBucket.n += 1;
            if (emailBucket.n > RESET_PASSWORD_VERIFY_MAX_PER_EMAIL) {
                const retryAfterSeconds = Math.max(1, Math.ceil((emailBucket.resetAt - now) / 1000));
                res.setHeader('Retry-After', String(retryAfterSeconds));
                return res.status(429).json({
                    error: 'Too many password reset attempts for this email. Please try again later.',
                    retryAfterSeconds
                });
            }
        }
    }

    next();
}

/**
 * Create a new opaque session for this login.
 * Multiple devices may stay signed in at once (one Session row per device/browser).
 * If this request already presents a valid session cookie for the user → renew and reuse it.
 * @param {number} userId
 * @param {{ existingToken?: string | null }} [opts]
 * @returns {Promise<{ token: string, sessionExpiresAt: string }>}
 */
async function createSessionRow(token, userId, expiresAt) {
    try {
        await prisma.session.create({
            data: { token, userId, expiresAt },
        });
    } catch (err) {
        // Table missing / adapter glitch — ensure schema then insert via SQL.
        await ensureLoginSchemaReady();
        await pool.query(
            `INSERT INTO "Session" ("token", "userId", "expiresAt", "createdAt")
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT ("token") DO UPDATE SET "expiresAt" = EXCLUDED."expiresAt"`,
            [token, userId, expiresAt],
        );
    }
}

async function createSessionTokenForUser(userId, opts = {}) {
    const uid = Number(userId);
    if (!Number.isInteger(uid) || uid < 1) {
        throw new Error('Invalid user id for session');
    }
    await ensureLoginSchemaReady();

    const existingToken =
        typeof opts.existingToken === 'string' && opts.existingToken.trim()
            ? opts.existingToken.trim()
            : null;
    const now = new Date();

    // Opportunistic cleanup of *this user's* expired sessions only (avoid global table scan on every login).
    await prisma.session.deleteMany({
        where: { userId: uid, expiresAt: { lt: now } },
    }).catch(async () => {
        await pool.query(
            `DELETE FROM "Session" WHERE "userId" = $1 AND "expiresAt" < $2`,
            [uid, now],
        ).catch(() => {});
    });

    // Same browser/device already signed in — renew that session; leave other devices alone.
    if (existingToken) {
        let existing = null;
        try {
            existing = await prisma.session.findFirst({
                where: {
                    token: existingToken,
                    userId: uid,
                    expiresAt: { gt: now },
                },
                select: { token: true },
            });
        } catch {
            const { rows } = await pool.query(
                `SELECT "token" FROM "Session"
                 WHERE "token" = $1 AND "userId" = $2 AND "expiresAt" > $3
                 LIMIT 1`,
                [existingToken, uid, now],
            );
            existing = rows[0] || null;
        }
        if (existing) {
            const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
            await prisma.session.update({
                where: { token: existing.token },
                data: { expiresAt },
            }).catch(async () => {
                await pool.query(
                    `UPDATE "Session" SET "expiresAt" = $1 WHERE "token" = $2`,
                    [expiresAt, existing.token],
                );
            });
            await stampUserLoginTimes(uid);
            return {
                token: existing.token,
                sessionExpiresAt: expiresAt.toISOString(),
            };
        }
    }

    // New device/browser — create an additional session without revoking others.
    const token = crypto.randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
    await createSessionRow(token, uid, expiresAt);
    await stampUserLoginTimes(uid);
    return { token, sessionExpiresAt: expiresAt.toISOString() };
}

async function stampUserLoginTimes(uid) {
    const loginStamp = await prisma.user.findUnique({
        where: { id: uid },
        select: { firstLoginAt: true },
    }).catch(() => null);
    await prisma.user.update({
        where: { id: uid },
        data: {
            lastLoginAt: new Date(),
            ...(loginStamp?.firstLoginAt == null ? { firstLoginAt: new Date() } : {}),
        },
    }).catch(() => {});
}

/**
 * Revoke every server session for a user.
 * Used after password change/reset or account deactivation so all devices must sign in again.
 */
async function invalidateAllUserSessions(userId) {
    const uid = Number.parseInt(String(userId), 10);
    if (!Number.isInteger(uid) || uid < 1) return 0;
    const { count } = await prisma.session.deleteMany({ where: { userId: uid } });
    return count;
}

/** Extend active sessions on use so working users are not logged out at a fixed deadline. */
async function maybeRenewSessionExpiry(sessionToken, currentExpiresAt) {
    const now = Date.now();
    const expiresMs = currentExpiresAt instanceof Date
        ? currentExpiresAt.getTime()
        : new Date(currentExpiresAt).getTime();
    if (!Number.isFinite(expiresMs)) {
        return new Date(now + SESSION_MAX_AGE_MS).toISOString();
    }
    if (expiresMs - now > SESSION_RENEW_WHEN_REMAINING_MS) {
        return new Date(expiresMs).toISOString();
    }
    const newExpiresAt = new Date(now + SESSION_MAX_AGE_MS);
    await prisma.session.update({
        where: { token: sessionToken },
        data: { expiresAt: newExpiresAt },
    });
    return newExpiresAt.toISOString();
}

/** Same for unknown email and wrong password — never reveal whether an address is registered. */
const LOGIN_INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

/** Login JSON must use only these keys (no client-supplied id / role / profile). */
const LOGIN_ALLOWED_BODY_KEYS = new Set(['email', 'password']);

/** Signup-complete JSON must use only these keys (no client-supplied user id or token). */
const SIGNUP_COMPLETE_ALLOWED_BODY_KEYS = new Set([
    'email', 'otp', 'firstName', 'lastName', 'mobile', 'phoneCountry', 'password',
]);

const FORGOT_PASSWORD_ALLOWED_BODY_KEYS = new Set(['email']);
const RESET_PASSWORD_ALLOWED_BODY_KEYS = new Set(['email', 'otp', 'newPassword']);

function getDisallowedExtraKeysError(body, allowedSet) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return 'Invalid request body';
    }
    for (const key of Object.keys(body)) {
        if (!allowedSet.has(key)) {
            return 'Invalid request';
        }
    }
    return null;
}

/** Public user profile after login — always loaded from DB by verified user id (not from request). */
const LOGIN_SUCCESS_USER_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    mobile: true,
    role: true,
    customRoleName: true,
    isActive: true,
    creatorId: true,
    createdAt: true,
    updatedAt: true,
    trialStartDate: true,
    trialEndDate: true,
    subscriptionStatus: true,
    subscriptionPlan: true,
    planStartDate: true,
    planExpiryDate: true,
    nextBillingDate: true,
    stripeCustomerId: true,
    stripeSubscriptionId: true,
    stripePriceId: true,
    stripeInvoiceId: true,
    stripePaymentIntentId: true,
    renewalType: true,
    autopayConsent: true,
    onboardingCompleted: true,
    emailVerifiedAt: true
};

/** Trial removed — grant full access on first login/signup instead of starting a 14-day trial. */
async function ensureUserTrialStarted(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, subscriptionStatus: true }
    });
    if (!user || user.role === 'superadmin') return false;
    if (user.subscriptionStatus === 'active') return false;

    await prisma.user.update({
        where: { id: userId },
        data: {
            subscriptionStatus: 'active',
            trialStartDate: null,
            trialEndDate: null,
        }
    });
    return true;
}

export {
    SESSION_MAX_AGE_MS,
    SESSION_RENEW_WHEN_REMAINING_MS,
    SESSION_EXPIRES_HEADER,
    SESSION_COOKIE_NAME,
    parseRequestCookies,
    sessionCookieSecure,
    serializeSessionCookie,
    appendSessionCookie,
    clearSessionCookie,
    getSessionTokenFromRequest,
    sendAuthenticatedSession,
    LOGIN_MAX_FAILED_ATTEMPTS,
    LOGIN_IP_WINDOW_MS,
    LOGIN_IP_MAX_IN_WINDOW,
    loginIpBuckets,
    loginIpRateLimit,
    createSessionTokenForUser,
    ensureLoginSchemaReady,
    invalidateAllUserSessions,
    maybeRenewSessionExpiry,
    LOGIN_INVALID_CREDENTIALS_MESSAGE,
    LOGIN_ALLOWED_BODY_KEYS,
    SIGNUP_COMPLETE_ALLOWED_BODY_KEYS,
    FORGOT_PASSWORD_ALLOWED_BODY_KEYS,
    RESET_PASSWORD_ALLOWED_BODY_KEYS,
    getDisallowedExtraKeysError,
    LOGIN_SUCCESS_USER_SELECT,
    ensureUserTrialStarted,
};
