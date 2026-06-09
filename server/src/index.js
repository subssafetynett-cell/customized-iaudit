import express from 'express';
import cors from 'cors';
import { loadServerEnv } from './loadEnv.js';
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import prisma, { handlePrismaError, pool } from './prisma.js';
import { runOtpSendExclusive, withPgOtpAdvisoryLock } from './otpSendLock.js';
import bcrypt from 'bcrypt';
import Stripe from 'stripe';
import { STRIPE_CONFIG } from './stripe-config.js';
import { ensureSuperAdminUser } from './ensureSuperAdmin.js';
import { deleteUserCompletely } from './deleteUser.js';
import {
    COMPANY_TEXT_LIMITS,
    DEPT_TEXT_LIMITS,
    PERSON_NAME_MAX,
    PHONE_DIGITS_LENGTH,
    SITE_TEXT_LIMITS,
    organizationTextLengthError,
    sanitizeLogoField,
    sanitizeOrganizationText,
    sanitizePersonName,
    sanitizePhoneField,
    sanitizePlainText,
    sanitizeShortLabel,
    sanitizeStringArray,
    sanitizeAuditDataPayload,
    escapeHtml
} from './textSanitize.js';

loadServerEnv();

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+=\-\[\]\\\/~^]).{8,}$/;

/** Server-side session lifetime (opaque token stored in DB, sent as Bearer token). */
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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

/** @returns {{ token: string, sessionExpiresAt: string }} ISO time when the DB session row expires */
async function createSessionTokenForUser(userId) {
    await prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } }
    }).catch(() => {});
    const token = crypto.randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
    const now = new Date();
    await prisma.session.create({
        data: { token, userId, expiresAt }
    });
    const loginStamp = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstLoginAt: true }
    }).catch(() => null);
    await prisma.user.update({
        where: { id: userId },
        data: {
            lastLoginAt: now,
            ...(loginStamp?.firstLoginAt == null ? { firstLoginAt: now } : {})
        }
    }).catch(() => {});
    return { token, sessionExpiresAt: expiresAt.toISOString() };
}

/** Same for unknown email and wrong password — never reveal whether an address is registered. */
const LOGIN_INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

/** Login JSON must use only these keys (no client-supplied id / role / profile). */
const LOGIN_ALLOWED_BODY_KEYS = new Set(['email', 'password']);

/** Signup-complete JSON must use only these keys (no client-supplied user id or token). */
const SIGNUP_COMPLETE_ALLOWED_BODY_KEYS = new Set([
    'email', 'otp', 'firstName', 'lastName', 'mobile', 'password',
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

const TRIAL_DURATION_DAYS = 14;

/** Start a 14-day trial for eligible users (first login / signup). No-op if trial dates already exist or user is active/superadmin. */
async function ensureUserTrialStarted(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, subscriptionStatus: true, trialEndDate: true }
    });
    if (!user || user.role === 'superadmin') return false;
    if (user.subscriptionStatus === 'active') return false;
    if (user.trialEndDate) return false;

    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialStartDate.getDate() + TRIAL_DURATION_DAYS);

    await prisma.user.update({
        where: { id: userId },
        data: {
            trialStartDate,
            trialEndDate,
            subscriptionStatus: 'trial'
        }
    });
    return true;
}

// Email Transporter Configuration
const transporterConfig = process.env.SMTP_HOST ? {
    host: process.env.SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
    }
} : {
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
};

const transporter = nodemailer.createTransport({
    ...transporterConfig,
    connectionTimeout: 5000, // 5 seconds
    greetingTimeout: 5000    // 5 seconds
});


const app = express();
const PORT = process.env.PORT || 3001;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/** Routes registered here run while the URL still starts with `/api/` (before the strip below). */
const mountedApiRouter = express.Router();
// This router is mounted before global express.json(); parse JSON for all /api/* handlers on it.
mountedApiRouter.use(express.json({ limit: '50mb' }));

const CORS_ALLOWED_ORIGINS = new Set([
    'https://iaudit.global',
    'https://api.iaudit.global',
    'https://apps.iaudit.global',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
]);

app.use(cors({
    origin(origin, callback) {
        // Non-browser clients (curl, server-to-server) send no Origin header
        if (!origin) return callback(null, true);
        if (CORS_ALLOWED_ORIGINS.has(origin)) return callback(null, true);
        // Allow any subdomain of iaudit.global
        if (/^https?:\/\/([a-z0-9-]+\.)*iaudit\.global$/.test(origin)) {
            return callback(null, true);
        }
        // Any localhost port during local development (Vite may use 8080, 8081, 8082, …)
        if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires', 'x-user-id']
}));

// Full `/api/auth/...` paths must be registered before `app.use('/api', mountedApiRouter)` so they are
// not lost when the sub-router has no match (and so they work even if `/auth/...` aliases are missing).
app.post('/api/auth/forgot-password', express.json({ limit: '50mb' }), sendOtpIpRateLimit, handleForgotPassword);
app.post('/api/auth/reset-password', express.json({ limit: '50mb' }), handleResetPassword);

app.use('/api', mountedApiRouter);

// Strip `/api` so existing handlers stay registered as `/users`, `/companies`, etc.
app.use((req, res, next) => {
    const raw = req.url;
    const q = raw.indexOf('?');
    const pathname = q === -1 ? raw : raw.slice(0, q);
    const search = q === -1 ? '' : raw.slice(q);
    if (pathname === '/api' || pathname.startsWith('/api/')) {
        const rest = pathname === '/api' ? '/' : pathname.slice(4) || '/';
        req.url = (rest.startsWith('/') ? rest : `/${rest}`) + search;
        delete req._parsedUrl;
    }
    next();
});

// --- Stripe Webhook Route (MUST BE BEFORE express.json()) ---
app.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log(`Stripe Webhook Received: ${event.type}`);
    } catch (err) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Idempotency check
    const existingEvent = await prisma.webhookEvent.findUnique({ where: { id: event.id } });
    if (existingEvent && existingEvent.processed) {
        return res.json({ received: true, duplicate: true });
    }

    try {
        // Record event start
        await prisma.webhookEvent.upsert({
            where: { id: event.id },
            update: {},
            create: { id: event.id, type: event.type }
        });

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = Number.parseInt(session.metadata.userId);

                // 1. Update Payment table
                const duration = session.metadata?.duration || null;
                const billingType = session.metadata?.billingType || null;

                let planStartDate = new Date();
                let planExpiryDate = null;
                let nextBillingDate = null;

                const isMonthly = session.mode === 'subscription' && session.subscription;

                if (isMonthly) {
                    try {
                        const stripeSubForDates = await stripe.subscriptions.retrieve(session.subscription);
                        
                        console.log("SUB ID:", session.subscription);
                        console.log("RAW subscription object:", stripeSubForDates);
                        console.log("current_period_start:", stripeSubForDates?.current_period_start);
                        console.log("current_period_end:", stripeSubForDates?.current_period_end);

                        let startTimestamp = stripeSubForDates.current_period_start || stripeSubForDates.start_date;
                        let endTimestamp = stripeSubForDates.current_period_end;

                        if (!endTimestamp) {
                            // fallback: add 1 month manually
                            const tempDate = new Date(startTimestamp * 1000);
                            tempDate.setMonth(tempDate.getMonth() + 1);
                            endTimestamp = Math.floor(tempDate.getTime() / 1000);
                        }

                        planStartDate = new Date(startTimestamp * 1000);
                        nextBillingDate = new Date(endTimestamp * 1000);

                        planExpiryDate = new Date(planStartDate);
                        if (duration === '1year') {
                            planExpiryDate.setFullYear(planExpiryDate.getFullYear() + 1);
                        } else if (duration === '3years') {
                            planExpiryDate.setFullYear(planExpiryDate.getFullYear() + 3);
                        } else if (duration === '6years') {
                            planExpiryDate.setFullYear(planExpiryDate.getFullYear() + 6);
                        } else {
                            // Fallback if metadata is missing
                            planExpiryDate.setFullYear(planExpiryDate.getFullYear() + 1);
                        }
                    } catch (e) {
                        console.error('Failed to retrieve sub for dates', e);
                    }

                    if (!planStartDate || Number.isNaN(planStartDate.getTime())) {
                        console.error("Invalid planStartDate");
                        return;
                    }

                    if (!planExpiryDate || Number.isNaN(planExpiryDate.getTime())) {
                        console.error("Invalid planExpiryDate");
                        return;
                    }

                    if (!nextBillingDate || Number.isNaN(nextBillingDate.getTime())) {
                        console.error("Invalid nextBillingDate");
                        return;
                    }

                } else {
                    if (duration === '1year') {
                        planExpiryDate = new Date(planStartDate);
                        planExpiryDate.setFullYear(planExpiryDate.getFullYear() + 1);
                    } else if (duration === '3years') {
                        planExpiryDate = new Date(planStartDate);
                        planExpiryDate.setFullYear(planExpiryDate.getFullYear() + 3);
                    } else if (duration === '6years') {
                        planExpiryDate = new Date(planStartDate);
                        planExpiryDate.setFullYear(planExpiryDate.getFullYear() + 6);
                    }
                }

                console.log("Subscription Type:", isMonthly ? "MONTHLY" : "YEARLY");
                console.log("Start:", planStartDate);
                console.log("Expiry:", planExpiryDate);
                console.log("Next Billing:", nextBillingDate);

                // Resolve stripePaymentIntentId based on mode
                let paymentIntentId = session.payment_intent || null;

                // For subscriptions, payment_intent is NOT on the session — get it from the latest invoice
                if (!paymentIntentId && session.mode === 'subscription' && session.subscription) {
                    try {
                        // Use expand to get invoice data in one call — avoids timing issues
                        const stripeSub = await stripe.subscriptions.retrieve(session.subscription, {
                            expand: ['latest_invoice']
                        });
                        const latestInvoice = stripeSub.latest_invoice;
                        if (latestInvoice && typeof latestInvoice === 'object') {
                            // Invoice is expanded — payment_intent is directly available
                            paymentIntentId = latestInvoice.payment_intent || null;
                            // If payment_intent is an object (expanded), get the id
                            if (paymentIntentId && typeof paymentIntentId === 'object') {
                                paymentIntentId = paymentIntentId.id;
                            }
                        } else if (latestInvoice && typeof latestInvoice === 'string') {
                            // Invoice is a string ID — fetch it separately
                            const invoice = await stripe.invoices.retrieve(latestInvoice);
                            paymentIntentId = invoice.payment_intent || null;
                        }
                        console.log('PaymentIntentId from subscription invoice:', paymentIntentId);
                    } catch (e) {
                        console.error('Failed to retrieve paymentIntent from invoice:', e.message);
                    }
                }

                await prisma.payment.update({
                    where: { stripeSessionId: session.id },
                    data: {
                        status: 'paid',
                        amount: session.amount_total / 100,
                        stripePaymentIntentId: paymentIntentId,
                        stripeInvoiceId: session.invoice || null,
                        ...(duration && { duration }),
                        ...(billingType && { billingType })
                    }
                });
                console.log('Payment updated for session:', session.id, '| paymentIntent:', paymentIntentId, '| duration:', duration);

                // Calculate sub_renewal_date based on duration and billingType
                // For monthly: use Stripe's authoritative period_end (already stored in nextBillingDate)
                // For yearly/contracts: calculate from payment done date + duration
                let subRenewalDate;

                if (billingType === 'monthly' || billingType === 'MONTHLY') {
                    // nextBillingDate comes from Stripe's current_period_end — it handles 28/30/31 day months correctly
                    subRenewalDate = nextBillingDate || new Date();
                } else if (duration === '3years') {
                    subRenewalDate = new Date();
                    subRenewalDate.setFullYear(subRenewalDate.getFullYear() + 3);
                } else if (duration === '6years') {
                    subRenewalDate = new Date();
                    subRenewalDate.setFullYear(subRenewalDate.getFullYear() + 6);
                } else {
                    // 1year default for yearly/contract plans
                    subRenewalDate = new Date();
                    subRenewalDate.setFullYear(subRenewalDate.getFullYear() + 1);
                }

                // 2. For monthly subscriptions, update Subscription table
                if (session.mode === 'subscription' && session.subscription) {
                    const subscriptionId = session.subscription;

                    // Fetch full subscription from Stripe to get price ID and dates
                    const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
                    const priceId = stripeSub.items.data[0]?.price?.id || '';

                    // Safety check: validate dates before inserting
                    const periodStart = stripeSub.current_period_start
                        ? new Date(stripeSub.current_period_start * 1000)
                        : new Date();
                    const periodEnd = stripeSub.current_period_end
                        ? new Date(stripeSub.current_period_end * 1000)
                        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
                        console.error('Invalid subscription dates from Stripe:', {
                            current_period_start: stripeSub.current_period_start,
                            current_period_end: stripeSub.current_period_end
                        });
                        break; // Skip subscription upsert to avoid crash
                    }

                    await prisma.subscription.upsert({
                        where: { stripeSubscriptionId: subscriptionId },
                        update: {
                            status: 'active',
                            sub_renewal_date: subRenewalDate
                        },
                        create: {
                            userId: userId,
                            stripeSubscriptionId: subscriptionId,
                            plan: session.metadata.planId || 'unknown',
                            status: 'active',
                            cancelAtPeriodEnd: false,
                            stripePriceId: priceId,
                            currentPeriodStart: periodStart,
                            currentPeriodEnd: periodEnd,
                            sub_renewal_date: subRenewalDate
                        }
                    });
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            subscriptionStatus: 'active',
                            subscriptionPlan: session.metadata.planId,
                            stripeSubscriptionId: subscriptionId,
                            stripeCustomerId: session.customer,
                            planStartDate: planStartDate,
                            nextBillingDate: periodEnd,
                            renewalType: 'AUTOPAY',
                            autopayConsent: true
                        }
                    });
                    console.log('Subscription and User updated:', subscriptionId);
                }

                // 3. For one-time contract payments, activate user directly
                if (session.mode === 'payment') {
                    // Resolve actual priceId from STRIPE_CONFIG
                    const planKey = session.metadata.planId?.toUpperCase() || '';
                    const durationKey = duration || '1year';
                    const currencyKey = session.currency?.toUpperCase() || 'GBP';
                    const resolvedPriceId = STRIPE_CONFIG.PLANS[planKey]?.['YEARLY']?.[durationKey]?.[currencyKey] || 'yearly_plan';

                    await prisma.subscription.upsert({
                        where: { stripeSubscriptionId: session.id },
                        update: {
                            status: 'active',
                            sub_renewal_date: subRenewalDate,
                            currentPeriodEnd: subRenewalDate,
                            stripePriceId: resolvedPriceId
                        },
                        create: {
                            userId: userId,
                            stripeSubscriptionId: session.id, // using session.id as surrogate
                            plan: session.metadata.planId || 'unknown',
                            status: 'active',
                            cancelAtPeriodEnd: false,
                            stripePriceId: resolvedPriceId,
                            currentPeriodStart: new Date(),
                            currentPeriodEnd: subRenewalDate,
                            sub_renewal_date: subRenewalDate
                        }
                    });

                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            subscriptionStatus: 'active',
                            subscriptionPlan: session.metadata.planId,
                            planStartDate: planStartDate,
                            ...(planExpiryDate && { planExpiryDate })
                        }
                    });
                    console.log('User subscription activated for userId:', userId);
                }

                // 4. Send subscription confirmation email to the user
                try {
                    const subscribedUser = await prisma.user.findUnique({ where: { id: userId } });
                    if (subscribedUser && subscribedUser.email) {
                        const planName = (session.metadata.planId || 'Premium').toUpperCase();
                        const paymentAmount = session.amount_total ? `${session.currency?.toUpperCase() === 'GBP' ? '£' : '$'}${(session.amount_total / 100).toFixed(2)}` : 'N/A';
                        const paymentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                        const billingLabel = isMonthly ? 'Monthly Subscription' : `Contract Billing (${duration || '1 Year'})`;
                        const nextDateLabel = isMonthly ? 'Next Billing Date' : 'Plan Expiry Date';
                        const nextDateValue = isMonthly
                            ? (nextBillingDate ? nextBillingDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A')
                            : (planExpiryDate ? planExpiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A');
                        const startDateValue = planStartDate ? planStartDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : paymentDate;

                        // 5. Finalize Payment record status
                        await prisma.payment.updateMany({
                            where: { stripeSessionId: session.id },
                            data: {
                                status: 'paid',
                                amount: (session.amount_total / 100),
                                stripePaymentIntentId: session.payment_intent || null,
                                stripeInvoiceId: session.invoice || null
                            }
                        });

                        const confirmationMail = {
                            from: process.env.SMTP_USER || 'noreply@iaudit.global',
                            to: subscribedUser.email,
                            subject: `Thank you for subscribing to iAudit ${planName}!`,
                            html: `
                                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                                    
                                    <!-- Header -->
                                    <div style="background: linear-gradient(135deg, #1e855e 0%, #213847 100%); padding: 40px 32px; text-align: center;">
                                        <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">Thank You for Subscribing!</h1>
                                        <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 15px; font-weight: 400;">Your iAudit ${planName} plan is now active.</p>
                                    </div>

                                    <!-- Greeting -->
                                    <div style="padding: 32px 32px 0;">
                                        <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                                            Dear <strong>${subscribedUser.firstName} ${subscribedUser.lastName}</strong>,
                                        </p>
                                        <p style="margin: 0 0 28px; color: #4b5563; font-size: 15px; line-height: 1.7;">
                                            We're delighted to confirm your subscription to iAudit. Below are your subscription details for your records. You can manage your subscription anytime from the <strong>Subscription</strong> page in your dashboard.
                                        </p>
                                    </div>

                                    <!-- Subscription Details Card -->
                                    <div style="padding: 0 32px 32px;">
                                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                                            
                                            <!-- Card Header -->
                                            <div style="background-color: #213847; padding: 16px 24px;">
                                                <h3 style="margin: 0; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">Subscription Details</h3>
                                            </div>

                                            <!-- Details Table -->
                                            <table style="width: 100%; border-collapse: collapse;">
                                                <tr style="border-bottom: 1px solid #e5e7eb;">
                                                    <td style="padding: 14px 24px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; width: 45%;">Plan Name</td>
                                                    <td style="padding: 14px 24px; color: #111827; font-size: 15px; font-weight: 700;">${planName}</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #e5e7eb;">
                                                    <td style="padding: 14px 24px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Billing Type</td>
                                                    <td style="padding: 14px 24px; color: #111827; font-size: 15px; font-weight: 700;">${billingLabel}</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #e5e7eb;">
                                                    <td style="padding: 14px 24px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Payment Amount</td>
                                                    <td style="padding: 14px 24px; color: #1e855e; font-size: 18px; font-weight: 800;">${paymentAmount}</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #e5e7eb;">
                                                    <td style="padding: 14px 24px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Date of Payment</td>
                                                    <td style="padding: 14px 24px; color: #111827; font-size: 15px; font-weight: 700;">${paymentDate}</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #e5e7eb;">
                                                    <td style="padding: 14px 24px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Plan Start Date</td>
                                                    <td style="padding: 14px 24px; color: #111827; font-size: 15px; font-weight: 700;">${startDateValue}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 14px 24px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${nextDateLabel}</td>
                                                    <td style="padding: 14px 24px; color: #111827; font-size: 15px; font-weight: 700;">${nextDateValue}</td>
                                                </tr>
                                            </table>
                                        </div>
                                    </div>

                                    <!-- Help Section -->
                                    <div style="padding: 0 32px 32px;">
                                        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px 24px; border-radius: 10px;">
                                            <p style="margin: 0 0 4px; color: #166534; font-size: 14px; font-weight: 700;">Need Help?</p>
                                            <p style="margin: 0; color: #15803d; font-size: 13px; line-height: 1.6;">
                                                If you have any questions or need assistance, contact our support team at 
                                                <a href="mailto:support@iaudit.global" style="color: #1e855e; font-weight: 700; text-decoration: underline;">support@iaudit.global</a>
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Footer -->
                                    <div style="background-color: #f1f5f9; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                                        <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} iAudit. All rights reserved.</p>
                                        <p style="margin: 0; color: #94a3b8; font-size: 11px;">This is an automated email. Please do not reply directly to this message.</p>
                                    </div>
                                </div>
                            `
                        };

                        // Fire and forget — don't block webhook response
                        transporter.sendMail(confirmationMail)
                            .then(() => console.log(`Subscription confirmation email sent to ${subscribedUser.email}`))
                            .catch(err => console.error('Failed to send subscription confirmation email:', err.message));
                    }
                } catch (emailError) {
                    console.error('Error preparing subscription confirmation email:', emailError.message);
                }

                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const sub = event.data.object;
                const userId = Number.parseInt(sub.metadata.userId);

                await prisma.subscription.upsert({
                    where: { stripeSubscriptionId: sub.id },
                    update: {
                        status: sub.status,
                        cancelAtPeriodEnd: sub.cancel_at_period_end,
                        currentPeriodEnd: new Date(sub.current_period_end * 1000),
                        currentPeriodStart: new Date(sub.current_period_start * 1000)
                    },
                    create: {
                        userId,
                        stripeSubscriptionId: sub.id,
                        plan: sub.metadata.planId,
                        status: sub.status,
                        cancelAtPeriodEnd: sub.cancel_at_period_end,
                        currentPeriodStart: new Date(sub.current_period_start * 1000),
                        currentPeriodEnd: new Date(sub.current_period_end * 1000),
                        stripePriceId: sub.items.data[0].price.id
                    }
                });

                await prisma.user.update({
                    where: { id: userId },
                    data: { 
                        subscriptionStatus: sub.status === 'active' ? 'active' : sub.status,
                        subscriptionPlan: sub.metadata.planId,
                        stripeSubscriptionId: sub.id
                    }
                });
                break;
            }

            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const userId = Number.parseInt(sub.metadata.userId);

                await prisma.subscription.update({
                    where: { stripeSubscriptionId: sub.id },
                    data: { status: 'canceled' }
                });

                await prisma.user.update({
                    where: { id: userId },
                    data: { subscriptionStatus: 'expired' }
                });
                break;
            }

            case 'invoice.paid':
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                
                if (!invoice.subscription) {
                    console.log("❌ Missing subscription ID, skipping update");
                    break;
                }

                console.log("=== START invoice DEBUG ===");
                try {
                    // Fetch subscription to get updated period end for renewal — Stripe is the source of truth
                    const renewedSub = await stripe.subscriptions.retrieve(invoice.subscription);

                    // Use Stripe's current_period_end directly — it handles all edge cases (28/30/31 day months, leap years)
                    const renewEnd = renewedSub.current_period_end
                        ? new Date(renewedSub.current_period_end * 1000)
                        : undefined;
                    const renewStart = renewedSub.current_period_start
                        ? new Date(renewedSub.current_period_start * 1000)
                        : undefined;

                    // sub_renewal_date = Stripe's current_period_end (next billing date) — single source, no manual math
                    const subRenewalDateFromStripe = renewEnd || new Date();

                    await prisma.subscription.update({
                        where: { stripeSubscriptionId: invoice.subscription },
                        data: {
                            status: 'active',
                            ...(renewStart && { currentPeriodStart: renewStart }),
                            ...(renewEnd && { currentPeriodEnd: renewEnd }),
                            sub_renewal_date: subRenewalDateFromStripe
                        }
                    });

                    console.log("Invoice ID:", invoice.id);
                    console.log("Subscription:", invoice.subscription);
                    console.log("Stripe period_end (new nextBillingDate):", renewEnd);

                    const user = await prisma.user.findFirst({
                        where: { stripeSubscriptionId: invoice.subscription }
                    });

                    if (!user) {
                        console.error(`User not found for subscription: ${invoice.subscription}`);
                    } else {
                        console.log("User found:", user.id);

                        // Always use Stripe's period end — never manually add months from existing DB date
                        // This prevents double-adding on first payment and handles month-length edge cases
                        if (renewEnd) {
                            await prisma.user.update({
                                where: { id: user.id },
                                data: { nextBillingDate: renewEnd }
                            });
                            console.log("nextBillingDate set from Stripe (authoritative):", renewEnd);
                        } else {
                            console.error("Stripe returned no current_period_end — skipping nextBillingDate update");
                        }
                    }
                    console.log("=== END invoice DEBUG ===");
                } catch (dbErr) {
                    console.error("CRITICAL DB UPDATE ERROR in invoice handler:", dbErr);
                }

                try {
                    // Fetch the invoice with deep expansion to get receipt URL (same as billing history)
                    const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
                        expand: ['charge', 'payment_intent.latest_charge', 'subscription']
                    });

                    // Also update stripePaymentIntentId on the Payment record for this subscription
                    if (invoice.payment_intent) {
                        // Find the payment by matching the customer's latest pending/paid payment
                        // SECURITY: Use metadata if available, fallback to customer ID lookup only as last resort
                        const metadataUserId = invoice.subscription_details?.metadata?.userId || 
                                               invoice.metadata?.userId || 
                                               fullInvoice?.subscription?.metadata?.userId;
                        
                        let user = null;
                        if (metadataUserId) {
                            user = await prisma.user.findUnique({ where: { id: Number.parseInt(metadataUserId) } });
                        }
                        
                        if (!user) {
                            const customer = invoice.customer;
                            user = await prisma.user.findFirst({ where: { stripeCustomerId: customer } });
                        }

                        if (user) {
                            // Update the most recent payment for this user that has no paymentIntentId
                            const payment = await prisma.payment.findFirst({
                                where: { userId: user.id, stripePaymentIntentId: null },
                                orderBy: { createdAt: 'desc' }
                            });
                            if (payment) {
                                await prisma.payment.update({
                                    where: { id: payment.id },
                                    data: { stripePaymentIntentId: invoice.payment_intent }
                                });
                                console.log('PaymentIntentId updated from invoice:', invoice.payment_intent);
                            }
                        }
                    }

                    console.log('Subscription renewed via invoice.paid:', invoice.subscription);


                    const invoiceUser = await prisma.user.findFirst({
                        where: { 
                            OR: [
                                { stripeCustomerId: fullInvoice.customer },
                                { email: fullInvoice.customer_email }
                            ]
                        }
                    });

                    if (invoiceUser && invoiceUser.email) {
                        // Extract receipt URL exactly as billing history does
                        let receipt_url = null;
                        if (fullInvoice.charge && typeof fullInvoice.charge === 'object') {
                            receipt_url = fullInvoice.charge.receipt_url;
                        }
                        if (!receipt_url && fullInvoice.payment_intent && typeof fullInvoice.payment_intent === 'object') {
                            receipt_url = fullInvoice.payment_intent.latest_charge?.receipt_url ||
                                          fullInvoice.payment_intent.charges?.data?.[0]?.receipt_url;
                        }
                        if (!receipt_url) {
                            receipt_url = fullInvoice.hosted_invoice_url;
                        }

                        const invoice_pdf = fullInvoice.invoice_pdf || null;
                        const hosted_invoice_url = fullInvoice.hosted_invoice_url || null;
                        const amountPaid = fullInvoice.amount_paid ? `${fullInvoice.currency?.toUpperCase() === 'GBP' ? '£' : '$'}${(fullInvoice.amount_paid / 100).toFixed(2)}` : 'N/A';
                        const invoiceNumber = fullInvoice.number || invoice.id;
                        const paymentDate = fullInvoice.status_transitions?.paid_at
                            ? new Date(fullInvoice.status_transitions.paid_at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                            : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

                        const invoiceMail = {
                            from: process.env.SMTP_USER || 'noreply@iaudit.global',
                            to: invoiceUser.email,
                            subject: `Your iAudit Invoice – ${invoiceNumber}`,
                            html: `
                                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">

                                    <!-- Header -->
                                    <div style="background: linear-gradient(135deg, #213847 0%, #1e855e 100%); padding: 36px 32px; text-align: center;">
                                        <h1 style="color: #ffffff; margin: 0 0 6px; font-size: 24px; font-weight: 800; letter-spacing: -0.015em;">Your iAudit Invoice</h1>
                                        <p style="color: rgba(255,255,255,0.75); margin: 0; font-size: 14px;">Invoice Reference: <strong style="color:#fff;">${invoiceNumber}</strong></p>
                                    </div>

                                    <!-- Greeting -->
                                    <div style="padding: 32px 32px 0;">
                                        <p style="margin: 0 0 12px; color: #374151; font-size: 16px; line-height: 1.6;">
                                            Hi <strong>${invoiceUser.firstName} ${invoiceUser.lastName}</strong>,
                                        </p>
                                        <p style="margin: 0 0 28px; color: #4b5563; font-size: 15px; line-height: 1.7;">
                                            Thank you for your payment. Here's your latest invoice for your iAudit subscription. Your documents are available via the links below.
                                        </p>
                                    </div>

                                    <!-- Payment Summary Card -->
                                    <div style="padding: 0 32px 28px;">
                                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                                            <div style="background-color: #213847; padding: 14px 24px;">
                                                <h3 style="margin: 0; color: #ffffff; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">Payment Summary</h3>
                                            </div>
                                            <table style="width: 100%; border-collapse: collapse;">
                                                <tr style="border-bottom: 1px solid #e5e7eb;">
                                                    <td style="padding: 13px 24px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; width: 45%;">Invoice Number</td>
                                                    <td style="padding: 13px 24px; color: #111827; font-size: 14px; font-weight: 700;">${invoiceNumber}</td>
                                                </tr>
                                                <tr style="border-bottom: 1px solid #e5e7eb;">
                                                    <td style="padding: 13px 24px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Date of Payment</td>
                                                    <td style="padding: 13px 24px; color: #111827; font-size: 14px; font-weight: 700;">${paymentDate}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 13px 24px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Amount Paid</td>
                                                    <td style="padding: 13px 24px; color: #1e855e; font-size: 20px; font-weight: 800;">${amountPaid}</td>
                                                </tr>
                                            </table>
                                        </div>
                                    </div>

                                    <!-- Document Links -->
                                    <div style="padding: 0 32px 32px;">
                                        <p style="margin: 0 0 16px; color: #374151; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Your Documents</p>
                                        <div style="display: flex; flex-direction: column; gap: 12px;">
                                            ${hosted_invoice_url ? `
                                            <a href="${hosted_invoice_url}" target="_blank" style="display: block; background-color: #213847; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 10px; font-size: 14px; font-weight: 700; text-align: center;">
                                                🧾 &nbsp; View Invoice Online
                                            </a>` : ''}
                                            ${invoice_pdf ? `
                                            <a href="${invoice_pdf}" target="_blank" style="display: block; background-color: #f8fafc; border: 1.5px solid #e2e8f0; color: #213847; text-decoration: none; padding: 14px 22px; border-radius: 10px; font-size: 14px; font-weight: 700; text-align: center;">
                                                📄 &nbsp; Download Invoice PDF
                                            </a>` : ''}
                                            ${receipt_url ? `
                                            <a href="${receipt_url}" target="_blank" style="display: block; background-color: #f0fdf4; border: 1.5px solid #bbf7d0; color: #166534; text-decoration: none; padding: 14px 22px; border-radius: 10px; font-size: 14px; font-weight: 700; text-align: center;">
                                                ✅ &nbsp; View Payment Receipt
                                            </a>` : ''}
                                        </div>
                                        ${!hosted_invoice_url && !invoice_pdf && !receipt_url ? `<p style="color:#9ca3af; font-size:13px; margin-top:8px; font-style:italic;">Documents will be available shortly. You can also access them from your Billing History in the dashboard.</p>` : ''}
                                    </div>

                                    <!-- Help -->
                                    <div style="padding: 0 32px 32px;">
                                        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 18px 22px; border-radius: 10px;">
                                            <p style="margin: 0 0 4px; color: #166534; font-size: 14px; font-weight: 700;">Questions about this invoice?</p>
                                            <p style="margin: 0; color: #15803d; font-size: 13px; line-height: 1.6;">
                                                Contact our support team at
                                                <a href="mailto:support@iaudit.global" style="color: #1e855e; font-weight: 700; text-decoration: underline;">support@iaudit.global</a>
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Footer -->
                                    <div style="background-color: #f1f5f9; padding: 18px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                                        <p style="margin: 0 0 4px; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} iAudit. All rights reserved.</p>
                                        <p style="margin: 0; color: #94a3b8; font-size: 11px;">This is an automated billing notification. Please do not reply to this email.</p>
                                    </div>
                                </div>
                            `
                        };

                        transporter.sendMail(invoiceMail)
                            .then(() => console.log(`Invoice email sent to ${invoiceUser.email} for invoice ${invoiceNumber}`))
                            .catch(err => console.error('Failed to send invoice email:', err.message));
                    }
                } catch (invoiceEmailError) {
                    console.error('Error sending invoice email:', invoiceEmailError.message);
                }

                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    await prisma.subscription.update({
                        where: { stripeSubscriptionId: invoice.subscription },
                        data: { status: 'past_due' }
                    });
                    // Also update User status
                    const failedSub = await stripe.subscriptions.retrieve(invoice.subscription);
                    if (failedSub.metadata?.userId) {
                        await prisma.user.update({
                            where: { id: Number.parseInt(failedSub.metadata.userId) },
                            data: { subscriptionStatus: 'past_due' }
                        });
                    }
                    console.log('Subscription marked past_due via invoice.payment_failed:', invoice.subscription);
                }
                break;
            }
        }

        // Mark as processed
        await prisma.webhookEvent.update({
            where: { id: event.id },
            data: { processed: true }
        });

        res.status(200).send(); // Send empty 200 as per common practice
    } catch (error) {
        console.error(`Webhook Processing Error: ${error.message}`);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

app.use(express.json({ limit: '50mb' }));

// Content Security Policy middleware to allow Google Fonts and self-hosted resources
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' https://iaudit.global https://*.iaudit.global; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "script-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "connect-src 'self' https://iaudit.global https://*.iaudit.global https://fonts.googleapis.com;"
    );

    next();
});

// Prevent caching for API routes to fix AWS caching issue where companies/sites disappear on refresh
app.use('/', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// Middleware to check if a user's trial has expired
const checkTrialExpiration = async (req, res, next) => {
    let userId;

    if (req.user != null && req.user.id != null) {
        const jwtId = Number.parseInt(String(req.user.id), 10);
        const spoof =
            (req.query && req.query.userId) ||
            (req.body && req.body.userId) ||
            (req.params && req.params.userId) ||
            (req.headers && req.headers['x-user-id']);
        if (spoof != null && spoof !== undefined && String(spoof) !== 'undefined' && String(spoof) !== 'null') {
            const alt = Number.parseInt(String(spoof), 10);
            if (!Number.isNaN(alt) && alt !== jwtId) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'User scope does not match your session.'
                });
            }
        }
        userId = jwtId;
    } else {
        userId =
            (req.query && req.query.userId) ||
            (req.body && req.body.userId) ||
            (req.params && req.params.userId) ||
            (req.headers && req.headers['x-user-id']);
    }

    if (userId === undefined || userId === null || userId === 'undefined' || userId === 'null') {
        return next();
    }

    try {
        const parsedUserId = typeof userId === 'number' ? userId : Number.parseInt(String(userId), 10);
        if (Number.isNaN(parsedUserId)) return next();

        const user = await prisma.user.findUnique({
            where: { id: parsedUserId },
            select: { subscriptionStatus: true, trialEndDate: true, role: true }
        });

        if (!user) return next();

        if (user.role === 'superadmin') {
            return next();
        }

        // 1. Handle No Subscription Status (New Users)
        // Allow the request so the frontend can display the TrialModal on the dashboard.
        if (!user.subscriptionStatus) {
            return next();
        }

        // 2. Handle Trial Status
        if (user.subscriptionStatus === 'trial') {
            const isExpired = user.trialEndDate && new Date(user.trialEndDate) < new Date();

            if (isExpired) {
                // Automatically update the status in DB for cleaner future checks
                await prisma.user.update({
                    where: { id: parsedUserId },
                    data: { subscriptionStatus: 'expired' }
                });

                return res.status(403).json({
                    error: 'TrialExpired',
                    message: 'Your free trial has expired. Please upgrade to a subscription to continue.'
                });
            }

            // Trial is still active
            return next();
        }

        // 3. Handle Explicitly Expired Status
        if (user.subscriptionStatus === 'expired') {
            return res.status(403).json({
                error: 'TrialExpired',
                message: 'Your free trial has ended. Please upgrade your plan to continue using premium features.'
            });
        }

        // 4. Handle Active Subscription
        if (user.subscriptionStatus === 'active') {
            return next();
        }

        next();
    } catch (error) {
        console.error('Middleware Trial Check Error:', error);
        next();
    }
};

const TRIAL_GAP_ANALYSIS_LIMIT = 3;
const TRIAL_SELF_ASSESSMENT_LIMIT = 3;
const TRIAL_AUDIT_PROGRAM_LIMIT = 1;

async function loadUserSubscriptionFlags(userId) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionStatus: true, role: true },
    });
}

function userRequiresTrialLimits(user) {
    if (!user) return false;
    if (user.role === 'superadmin') return false;
    return user.subscriptionStatus !== 'active';
}

function trialLimitResponse(resource, limit) {
    const labels = {
        gapAnalysis: 'gap analyses',
        selfAssessment: 'self assessments',
        auditProgram: 'audit programs',
    };
    const label = labels[resource] || 'items';
    return {
        error: 'TrialLimitExceeded',
        resource,
        limit,
        message: `You have reached the free trial limit of ${limit} ${label}. Please upgrade your plan to create more.`,
    };
}

async function countOrgAuditPrograms(actorId) {
    const orgRootId = await resolveActorOrgRootId(actorId);
    const subtreeIds = await collectOrgSubtreeUserIds(orgRootId);
    return prisma.auditProgram.count({
        where: { OR: buildOrgSubtreeProgramVisibilityOr(subtreeIds) },
    });
}

async function countOrgGapAnalyses(actorId) {
    const orgRootId = await resolveActorOrgRootId(actorId);
    const subtreeIds = await collectOrgSubtreeUserIds(orgRootId);
    let total = 0;
    for (const uid of subtreeIds) {
        const { analyses } = await ensureUserGapAnalysisStore(uid);
        total += analyses.length;
    }
    return total;
}

async function countOrgSelfAssessments(actorId) {
    const orgRootId = await resolveActorOrgRootId(actorId);
    const subtreeIds = await collectOrgSubtreeUserIds(orgRootId);
    let total = 0;
    for (const uid of subtreeIds) {
        const { assessments } = await ensureUserSelfAssessmentStore(uid);
        total += assessments.length;
    }
    return total;
}

async function rejectIfTrialLimitExceeded(actorId, resource, projectedCount) {
    const user = await loadUserSubscriptionFlags(actorId);
    if (!userRequiresTrialLimits(user)) return null;
    const limits = {
        gapAnalysis: TRIAL_GAP_ANALYSIS_LIMIT,
        selfAssessment: TRIAL_SELF_ASSESSMENT_LIMIT,
        auditProgram: TRIAL_AUDIT_PROGRAM_LIMIT,
    };
    const limit = limits[resource];
    if (limit == null) return null;
    if (projectedCount > limit) {
        return trialLimitResponse(resource, limit);
    }
    return null;
}

// Middleware: validate server-side session (DB row); each request must present a valid session token.
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.warn(`[SECURITY] Access denied to ${req.path}. No session token provided.`);
        return res.status(401).json({ error: 'Access denied. Please log in.' });
    }

    try {
        const session = await prisma.session.findFirst({
            where: {
                token,
                expiresAt: { gt: new Date() }
            },
            include: {
                user: {
                    select: { id: true, email: true, role: true, isActive: true }
                }
            }
        });

        if (!session?.user) {
            return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
        }

        if (!session.user.isActive) {
            await prisma.session.deleteMany({ where: { userId: session.user.id } });
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        req.sessionToken = token;
        req.user = {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role
        };
        next();
    } catch (err) {
        console.error(`[SECURITY] Session lookup failed for ${req.path}:`, err.message);
        return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    }
};

const router = express.Router();

// Email Transporter is defined near the top for safety

// Temporary in-memory store for OTPs - REMOVED for AWS scalability
// const otpStore = new Map();

// Helper function to generate a 6 digit code
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/** In-memory cooldown for authenticated assessment report emails (per user id). */
const assessmentReportEmailLastSent = new Map();

const ORG_ROOT_WALK_MAX_DEPTH = 32;

/** Walk creatorId chain to the account root (user with creatorId null). */
async function getOrgRootUserId(userId) {
    let currentId = userId;
    for (let depth = 0; depth < ORG_ROOT_WALK_MAX_DEPTH; depth++) {
        const row = await prisma.user.findUnique({
            where: { id: currentId },
            select: { id: true, creatorId: true }
        });
        if (!row) return null;
        if (row.creatorId == null) return row.id;
        currentId = row.creatorId;
    }
    return null;
}

/** All user ids in the same org (account root + every user created under that tree). */
async function collectOrgSubtreeUserIds(orgRootId) {
    if (orgRootId == null || !Number.isInteger(orgRootId) || orgRootId < 1) {
        return [];
    }
    const rows = await prisma.$queryRaw`
        WITH RECURSIVE subtree AS (
            SELECT id FROM "User" WHERE id = ${orgRootId}
            UNION
            SELECT u.id FROM "User" u
            INNER JOIN subtree t ON u."creatorId" = t.id
        )
        SELECT id FROM subtree
    `;
    return rows.map((r) => Number(r.id));
}

async function actorCanAccessTargetUser(actorId, targetUserId) {
    if (actorId === targetUserId) return true;
    const [actor, target] = await Promise.all([
        prisma.user.findUnique({ where: { id: actorId }, select: { role: true, creatorId: true } }),
        prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, creatorId: true } })
    ]);
    if (!actor || !target) return false;
    if (actor.role === 'superadmin') return true;
    // Account root (creatorId null): may manage anyone in the same org tree (e.g. users created by subordinates).
    const actorRootId = await getOrgRootUserId(actorId);
    if (actorRootId != null && actorId === actorRootId) {
        const targetRootId = await getOrgRootUserId(targetUserId);
        if (actorRootId === targetRootId) return true;
    }
    const actorOrgRoot = actor.creatorId != null ? actor.creatorId : actorId;
    if (target.id === actorOrgRoot) return true;
    if (target.creatorId === actorOrgRoot) return true;
    if (target.creatorId === actorId) return true;
    return false;
}

/**
 * Subscription / billing status (PII + Stripe fields): lock down horizontal IDOR.
 * Allowed: self; superadmin; org billing root (same org); user directly created by actor.
 * NOT allowed: sibling teammates reading each other's billing by swapping :id.
 */
async function actorCanViewUserBillingStatus(actorId, targetUserId) {
    if (actorId === targetUserId) return true;
    const [actor, target] = await Promise.all([
        prisma.user.findUnique({ where: { id: actorId }, select: { id: true, role: true } }),
        prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, creatorId: true } })
    ]);
    if (!actor || !target) return false;
    if (actor.role === 'superadmin') return true;

    const actorRoot = await getOrgRootUserId(actor.id);
    const targetRoot = await getOrgRootUserId(target.id);
    if (actorRoot != null && targetRoot != null && actorRoot === targetRoot && actor.id === actorRoot) {
        return true;
    }
    if (target.creatorId === actorId) {
        return true;
    }
    return false;
}

async function actorIsAuditee(actorId) {
    const actor = await prisma.user.findUnique({
        where: { id: Number(actorId) },
        select: { role: true },
    });
    return normalizeUserRole(actor?.role) === 'auditee';
}

async function getAuditeeAssignedSiteIds(auditeeId) {
    const sites = await prisma.site.findMany({
        where: { userId: Number(auditeeId) },
        select: { id: true },
    });
    return sites.map((s) => s.id);
}

async function auditeeCanAccessSiteId(auditeeId, siteId) {
    const parsedSiteId = Number(siteId);
    if (!Number.isInteger(parsedSiteId) || parsedSiteId < 1) return false;
    const site = await prisma.site.findFirst({
        where: { id: parsedSiteId, userId: Number(auditeeId) },
        select: { id: true },
    });
    return Boolean(site);
}

async function rejectIfAuditee(actorId, res, message = 'Forbidden') {
    if (await actorIsAuditee(actorId)) {
        res.status(403).json({ error: message });
        return true;
    }
    return false;
}

async function actorCanAccessAuditProgram(actorId, program) {
    if (!program) return false;
    if (await actorIsAuditee(actorId)) {
        return auditeeCanAccessSiteId(actorId, program.siteId);
    }
    if (program.userId != null && (await actorCanAccessTargetUser(actorId, program.userId))) return true;
    if (program.leadAuditorId === actorId) return true;
    if (Array.isArray(program.auditors) && program.auditors.some((a) => a.id === actorId)) return true;
    return false;
}

/** Collect all assignToEmail values nested anywhere in saved audit execution JSON. */
function collectAssigneeEmailsFromAuditData(auditData) {
    const emails = new Set();
    if (auditData == null) return emails;

    let data = auditData;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            return emails;
        }
    }
    if (!data || typeof data !== 'object') return emails;

    const visit = (node) => {
        if (node == null) return;
        if (Array.isArray(node)) {
            node.forEach(visit);
            return;
        }
        if (typeof node !== 'object') return;
        if (typeof node.assignToEmail === 'string') {
            const normalized = node.assignToEmail.toLowerCase().trim();
            if (normalized) emails.add(normalized);
        }
        Object.values(node).forEach(visit);
    };
    visit(data);
    return emails;
}

async function actorIsFindingAssignee(actorId, plan) {
    if (!plan?.auditData) return false;
    const actor = await prisma.user.findUnique({
        where: { id: Number(actorId) },
        select: { email: true },
    });
    if (!actor?.email) return false;
    const actorEmail = actor.email.toLowerCase().trim();
    return collectAssigneeEmailsFromAuditData(plan.auditData).has(actorEmail);
}

function applyFindingAssignmentToAuditData(auditData, assignment, assignToEmail, assignToName) {
    let data = auditData;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            data = {};
        }
    }
    if (!data || typeof data !== 'object') {
        data = {};
    } else {
        data = { ...data };
    }

    const email = String(assignToEmail || '').trim();
    const name = String(assignToName || '').trim();
    const patch = {
        assignToEmail: email,
        assignToName: name,
        assignTo: name && email ? `${name} (${email})` : name || email,
    };

    const source = String(assignment?.source || '').trim();
    const key = assignment?.key;

    if (source === 'clause' && key != null && String(key).trim()) {
        const clauseKey = String(key);
        data.clauseData = { ...(data.clauseData || {}) };
        data.clauseData[clauseKey] = { ...(data.clauseData[clauseKey] || {}), ...patch };
    } else if (source === 'checklist' && key != null && String(key).trim() !== '') {
        const checklistKey = String(key);
        data.checklistData = { ...(data.checklistData || {}) };
        data.checklistData[checklistKey] = { ...(data.checklistData[checklistKey] || {}), ...patch };
    } else if (source === 'process' && key != null && String(key).trim() !== '') {
        const idx = Number.parseInt(String(key), 10);
        if (!Number.isNaN(idx) && Array.isArray(data.processAudits) && data.processAudits[idx]) {
            data.processAudits = [...data.processAudits];
            data.processAudits[idx] = { ...data.processAudits[idx], ...patch };
        }
    }

    return data;
}

const ASSIGNED_FINDINGS_PLAN_SELECT = {
    id: true,
    executionId: true,
    auditType: true,
    auditName: true,
    date: true,
    location: true,
    createdAt: true,
    updatedAt: true,
    templateId: true,
    auditProgramId: true,
    userId: true,
    leadAuditorId: true,
    auditData: true,
    findingsData: true,
    auditProgram: {
        select: {
            siteId: true,
        },
    },
};

async function actorCanAccessAuditPlan(actorId, plan) {
    if (!plan) return false;
    if (await actorIsAuditee(actorId)) {
        const siteId = plan.auditProgram?.siteId ?? plan.siteId;
        if (siteId != null && (await auditeeCanAccessSiteId(actorId, siteId))) return true;
        if (await actorIsFindingAssignee(actorId, plan)) return true;
        return false;
    }
    if (plan.userId != null && (await actorCanAccessTargetUser(actorId, plan.userId))) return true;
    if (plan.userId === actorId) return true;
    if (plan.leadAuditorId === actorId) return true;
    if (Array.isArray(plan.auditors) && plan.auditors.some((a) => a.id === actorId)) return true;
    if (plan.auditProgram && await actorCanAccessAuditProgram(actorId, plan.auditProgram)) return true;
    if (await actorIsFindingAssignee(actorId, plan)) return true;
    return false;
}

async function findUserByEmail(rawEmail) {
    const email = String(rawEmail || '').toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'Valid email is required', status: 400 };
    }

    const user = await prisma.user.findFirst({
        where: {
            email: { equals: email, mode: 'insensitive' },
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
        },
    });

    if (!user) {
        return { found: false };
    }

    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    return { found: true, id: user.id, name, email: user.email };
}

async function sendFindingAssignmentEmail({
    assignToEmail,
    assignToName,
    assignerName,
    auditName,
    findingRef,
    findingType,
    auditPlanId,
}) {
    if (!isSmtpConfigured()) {
        console.warn('[FINDING-ASSIGN] SMTP not configured; skipping assignment email.');
        return { sent: false, skipped: true };
    }

    const safeAssignee = escapeHtml(assignToName || assignToEmail);
    const safeAssigner = escapeHtml(assignerName || 'A team member');
    const safeAudit = escapeHtml(auditName || 'an audit');
    const safeRef = escapeHtml(findingRef || 'Finding');
    const safeType = escapeHtml(findingType || '');
    const loginUrl = getAppLoginUrl();
    const findingsUrl = `${String(process.env.FRONTEND_URL || 'http://localhost:8080').trim().replace(/\/$/, '')}/audit-findings`;

    const subject = `${safeAssigner} assigned you an audit finding`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
            <h2 style="color: #213847; margin-bottom: 8px;">Audit finding assigned to you</h2>
            <p style="font-size: 15px; line-height: 1.6;">
                <strong>${safeAssigner}</strong> assigned you a finding on <strong>${safeAudit}</strong>.
                Please log in to iAudit Global and complete it.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">Finding</p>
                <p style="margin: 0; font-size: 15px; font-weight: bold;">${safeRef}${safeType ? ` (${safeType})` : ''}</p>
            </div>
            <p style="margin: 24px 0;">
                <a href="${findingsUrl}" style="display: inline-block; background: #1e855e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
                    View my findings
                </a>
            </p>
            <p style="font-size: 13px; color: #64748b;">
                Or sign in at <a href="${loginUrl}" style="color: #1e855e;">${loginUrl}</a>
            </p>
            <p style="margin-top: 24px; font-size: 11px; color: #94a3b8;">Audit plan #${Number(auditPlanId) || ''} · This is an automated message.</p>
        </div>
    `;

    await transporter.sendMail({
        from: getSmtpFromAddress(),
        to: assignToEmail,
        subject,
        html,
        text: `${assignerName || 'A team member'} assigned you a finding (${findingRef || 'Finding'}) on ${auditName || 'an audit'}. Please log in to our app and complete it: ${findingsUrl}`,
    });

    return { sent: true };
}

async function resolveActorOrgRootId(actorId) {
    const root = await getOrgRootUserId(actorId);
    return root ?? actorId;
}

async function actorIsInOrgSubtree(actorId, orgRootUserId) {
    if (actorId === orgRootUserId) return true;
    const subtree = await collectOrgSubtreeUserIds(orgRootUserId);
    return subtree.includes(actorId);
}

async function actorCanReadOrgAssessmentStore(actorId, orgRootUserId) {
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
    if (!actor) return false;
    if (actor.role === 'superadmin') return true;
    return actorIsInOrgSubtree(actorId, orgRootUserId);
}

const USER_ASSIGNABLE_ROLES = new Set(['admin', 'auditor', 'lead_auditor', 'other']);

function normalizeUserRole(role) {
    return String(role ?? '').trim().toLowerCase();
}

/** Create/update/delete users and change roles — org admins only (not auditors/auditees). */
async function actorCanManageOrgUsers(actorId) {
    const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { role: true, creatorId: true }
    });
    if (!actor) return false;
    const r = normalizeUserRole(actor.role);
    if (r === 'superadmin' || r === 'admin') return true;
    // Organization root (no creator) may manage users in their org; auditees never may.
    if (actor.creatorId == null && r !== 'auditee') return true;
    return false;
}

/** User is designated lead auditor on at least one audit program or plan. */
async function actorIsLeadAuditor(actorId) {
    const id = Number(actorId);
    if (!Number.isInteger(id) || id < 1) return false;
    const [programCount, planCount] = await Promise.all([
        prisma.auditProgram.count({ where: { leadAuditorId: id } }),
        prisma.auditPlan.count({ where: { leadAuditorId: id } }),
    ]);
    return programCount > 0 || planCount > 0;
}

/** Company admin (org root / admin role), lead auditor role, or lead on an audit program/plan. */
async function actorCanInviteAuditee(actorId) {
    if (await actorCanManageOrgUsers(actorId)) return true;
    if (await actorIsLeadAuditor(actorId)) return true;
    const actor = await prisma.user.findUnique({
        where: { id: Number(actorId) },
        select: { role: true },
    });
    return normalizeUserRole(actor?.role) === 'lead_auditor';
}

async function siteIdsInActorOrg(actorId) {
    const orgRootId = await getOrgRootUserId(actorId);
    const ownerUserIds =
        orgRootId != null ? await collectOrgSubtreeUserIds(orgRootId) : [Number(actorId)];
    const companies = await prisma.company.findMany({
        where: { userId: { in: ownerUserIds } },
        select: { sites: { select: { id: true } } },
    });
    return new Set(companies.flatMap((c) => c.sites.map((s) => s.id)));
}

async function actorCanAssignAuditeeToSite(actorId, siteId) {
    const parsed = Number.parseInt(String(siteId), 10);
    if (Number.isNaN(parsed) || parsed < 1) return false;
    const allowed = await siteIdsInActorOrg(actorId);
    return allowed.has(parsed);
}

/** True when Site.userId references an auditee (not a legacy creator id from older site creation). */
function siteUserIsAuditee(site) {
    if (site?.userId == null) return false;
    return normalizeUserRole(site.user?.role) === 'auditee';
}

function parseAuditeeSiteIds(body) {
    const raw = body?.siteIds ?? (body?.siteId != null ? [body.siteId] : []);
    if (!Array.isArray(raw)) return null;
    const ids = [
        ...new Set(
            raw
                .map((id) => Number.parseInt(String(id), 10))
                .filter((id) => Number.isInteger(id) && id >= 1),
        ),
    ];
    return ids.length > 0 ? ids : null;
}

async function assignAuditeeToSites(tx, auditeeId, siteIds) {
    const sites = await tx.site.findMany({
        where: { id: { in: siteIds } },
        select: { id: true, userId: true, user: { select: { role: true } } },
    });
    if (sites.length !== siteIds.length) {
        const err = new Error('Site not found');
        err.code = 'SITE_NOT_FOUND';
        throw err;
    }

    for (const site of sites) {
        if (siteUserIsAuditee(site) && Number(site.userId) !== auditeeId) {
            const err = new Error('Site already assigned');
            err.code = 'SITE_ALREADY_ASSIGNED';
            throw err;
        }
        if (site.userId != null && !siteUserIsAuditee(site)) {
            await tx.site.update({
                where: { id: site.id },
                data: { userId: null },
            });
        }
    }

    await tx.site.updateMany({
        where: { userId: auditeeId, id: { notIn: siteIds } },
        data: { userId: null },
    });

    for (const siteId of siteIds) {
        const assigned = await tx.site.updateMany({
            where: { id: siteId, OR: [{ userId: null }, { userId: auditeeId }] },
            data: { userId: auditeeId },
        });
        if (assigned.count !== 1) {
            const err = new Error('Site already assigned');
            err.code = 'SITE_ALREADY_ASSIGNED';
            throw err;
        }
    }
}

async function formatAuditeeSiteLabels(siteIds) {
    if (!siteIds.length) return [];
    const sites = await prisma.site.findMany({
        where: { id: { in: siteIds } },
        select: { id: true, name: true, company: { select: { name: true } } },
        orderBy: { name: 'asc' },
    });
    return sites.map((s) => `${s.name} (${s.company?.name ?? 'Company'})`);
}

/**
 * Clear Site.userId when it still points at a non-auditee user (legacy rows stored the creator).
 * Pass ownerUserIds to limit cleanup to one org's companies; omit for a full migration pass.
 */
async function clearLegacySiteUserIds(client = prisma, ownerUserIds = null) {
    if (Array.isArray(ownerUserIds) && ownerUserIds.length === 0) return 0;

    const where = { userId: { not: null } };
    if (Array.isArray(ownerUserIds)) {
        where.company = { userId: { in: ownerUserIds } };
    }

    const occupied = await client.site.findMany({
        where,
        select: { id: true, userId: true, user: { select: { role: true } } },
    });
    const legacyIds = occupied
        .filter((s) => !siteUserIsAuditee(s))
        .map((s) => s.id);
    if (legacyIds.length === 0) return 0;
    const result = await client.site.updateMany({
        where: { id: { in: legacyIds } },
        data: { userId: null },
    });
    return result.count;
}

function defaultAuditeeNamesFromEmail(email) {
    const local = String(email || '').split('@')[0] || 'auditee';
    const parts = local.replace(/[^a-zA-Z0-9._-]/g, ' ').split(/\s+/).filter(Boolean);
    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');
    const firstName = cap(parts[0] || 'Auditee');
    const lastName = parts.length > 1 ? parts.slice(1).map(cap).join(' ') : 'User';
    return { firstName, lastName };
}

/** Org admin or invite-capable user managing an auditee in their scope. */
async function actorCanManageAuditee(actorId, targetId) {
    const tid = Number(targetId);
    if (!Number.isInteger(tid) || tid < 1) return false;
    if (!(await actorCanAccessTargetUser(actorId, tid))) return false;
    const target = await prisma.user.findUnique({
        where: { id: tid },
        select: { role: true },
    });
    if (!target || normalizeUserRole(target.role) !== 'auditee') return false;
    if (await actorCanManageOrgUsers(actorId)) return true;
    return actorCanInviteAuditee(actorId);
}

/** Per-user self assessment store — any signed-in user may read/write their own row. */
function actorCanWriteSelfAssessmentStore(actorId) {
    return Number.isInteger(actorId) && actorId > 0;
}

/** Gap/self assessment writes: org members except read-only auditors. */
async function actorCanWriteOrgAssessmentStore(actorId) {
    const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { role: true, creatorId: true }
    });
    if (!actor) return false;
    if (actor.role === 'superadmin' || actor.role === 'admin') return true;
    if (actor.creatorId == null) return true;
    if (actor.role === 'auditor') return false;
    return true;
}

function mergeJsonRecordsById(existingList, moreLists) {
    const byId = new Map();
    const add = (list) => {
        if (!Array.isArray(list)) return;
        for (const item of list) {
            if (item && item.id != null) byId.set(String(item.id), item);
        }
    };
    add(existingList);
    for (const list of moreLists) add(list);
    return Array.from(byId.values());
}

async function migrateLegacyUserGapStores(orgRootUserId, subtreeIds) {
    if (!subtreeIds.length) return;
    try {
        const legacyRows = await prisma.$queryRaw`
            SELECT "userId", analyses, draft FROM "UserGapAnalysisStore"
            WHERE "userId" = ANY(${subtreeIds}::int[])
        `;
        if (!legacyRows.length) return;

        let mergedAnalyses = [];
        let mergedDraft = null;
        for (const row of legacyRows) {
            mergedAnalyses = mergeJsonRecordsById(mergedAnalyses, [row.analyses]);
            if (row.draft) mergedDraft = row.draft;
        }

        const existing = await prisma.orgGapAnalysisStore.findUnique({
            where: { orgRootUserId }
        });
        const analyses = mergeJsonRecordsById(existing?.analyses ?? [], [mergedAnalyses]);
        const draft = existing?.draft ?? mergedDraft;

        await prisma.orgGapAnalysisStore.upsert({
            where: { orgRootUserId },
            create: { orgRootUserId, analyses, draft },
            update: { analyses, draft: draft ?? undefined }
        });

        await prisma.$executeRaw`
            DELETE FROM "UserGapAnalysisStore" WHERE "userId" = ANY(${subtreeIds}::int[])
        `;
    } catch (err) {
        if (err?.code !== 'P2010' && err?.code !== '42P01') {
            console.warn('Legacy gap store migration skipped:', err?.message || err);
        }
    }
}

async function migrateLegacyUserSelfAssessmentStores(orgRootUserId, subtreeIds) {
    if (!subtreeIds.length) return;
    try {
        const legacyRows = await prisma.$queryRaw`
            SELECT "userId", assessments, draft FROM "UserSelfAssessmentStore"
            WHERE "userId" = ANY(${subtreeIds}::int[])
        `;
        if (!legacyRows.length) return;

        let mergedAssessments = [];
        let mergedDraft = null;
        for (const row of legacyRows) {
            mergedAssessments = mergeJsonRecordsById(mergedAssessments, [row.assessments]);
            if (row.draft) mergedDraft = row.draft;
        }

        const existing = await prisma.orgSelfAssessmentStore.findUnique({
            where: { orgRootUserId }
        });
        const assessments = mergeJsonRecordsById(existing?.assessments ?? [], [mergedAssessments]);
        const draft = existing?.draft ?? mergedDraft;

        await prisma.orgSelfAssessmentStore.upsert({
            where: { orgRootUserId },
            create: { orgRootUserId, assessments, draft },
            update: { assessments, draft: draft ?? undefined }
        });

        await prisma.$executeRaw`
            DELETE FROM "UserSelfAssessmentStore" WHERE "userId" = ANY(${subtreeIds}::int[])
        `;
    } catch (err) {
        if (err?.code !== 'P2010' && err?.code !== '42P01') {
            console.warn('Legacy self assessment store migration skipped:', err?.message || err);
        }
    }
}

function gapAnalysisOwnerId(record) {
    const id = record?.createdByUserId ?? record?.userId;
    const n = Number(id);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function filterGapAnalysesForUser(analyses, userId) {
    if (!Array.isArray(analyses)) return [];
    return analyses.filter((a) => gapAnalysisOwnerId(a) === userId);
}

function stampGapAnalysesForUser(analyses, userId) {
    if (!Array.isArray(analyses)) return [];
    return analyses.map((a) => ({
        ...a,
        createdByUserId: gapAnalysisOwnerId(a) ?? userId,
        userId,
    }));
}

function gapAnalysisDraftForUser(draft, userId) {
    if (!draft || typeof draft !== 'object') return null;
    const owner = Number(draft.ownerUserId);
    if (Number.isInteger(owner) && owner > 0 && owner !== userId) return null;
    return { ...draft, ownerUserId: userId };
}

async function importOwnedGapAnalysesFromOrgStore(actorId) {
    const orgRootUserId = await resolveActorOrgRootId(actorId);
    const orgRow = await prisma.orgGapAnalysisStore.findUnique({
        where: { orgRootUserId },
    });
    if (!orgRow) return [];
    return filterGapAnalysesForUser(orgRow.analyses, actorId);
}

async function ensureUserGapAnalysisStore(actorId) {
    let row = await prisma.userGapAnalysisStore.findUnique({ where: { userId: actorId } });
    if (!row) {
        let analyses = await importOwnedGapAnalysesFromOrgStore(actorId);
        let draft = null;
        try {
            const legacyRows = await prisma.$queryRaw`
                SELECT analyses, draft FROM "UserGapAnalysisStore" WHERE "userId" = ${actorId}
            `;
            if (legacyRows?.length) {
                const legacy = legacyRows[0];
                analyses = stampGapAnalysesForUser(
                    filterGapAnalysesForUser(legacy.analyses, actorId),
                    actorId,
                );
                draft = gapAnalysisDraftForUser(legacy.draft, actorId);
            }
        } catch (err) {
            if (err?.code !== 'P2010' && err?.code !== '42P01') {
                console.warn('Legacy user gap analysis read skipped:', err?.message || err);
            }
        }
        row = await prisma.userGapAnalysisStore.create({
            data: { userId: actorId, analyses, draft },
        });
    }
    let analyses = filterGapAnalysesForUser(row.analyses, actorId);
    const draft = gapAnalysisDraftForUser(row.draft, actorId);
    const storedLen = Array.isArray(row.analyses) ? row.analyses.length : 0;
    if (analyses.length !== storedLen || draft !== row.draft) {
        row = await prisma.userGapAnalysisStore.update({
            where: { userId: actorId },
            data: { analyses: stampGapAnalysesForUser(analyses, actorId), draft },
        });
        analyses = filterGapAnalysesForUser(row.analyses, actorId);
    }
    return { userId: actorId, analyses, draft, row };
}

function selfAssessmentOwnerId(record) {
    const id = record?.createdByUserId ?? record?.userId;
    const n = Number(id);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function filterSelfAssessmentsForUser(assessments, userId) {
    if (!Array.isArray(assessments)) return [];
    return assessments.filter((a) => selfAssessmentOwnerId(a) === userId);
}

function stampSelfAssessmentsForUser(assessments, userId) {
    if (!Array.isArray(assessments)) return [];
    return assessments.map((a) => ({
        ...a,
        createdByUserId: selfAssessmentOwnerId(a) ?? userId,
        userId,
    }));
}

function selfAssessmentDraftForUser(draft, userId) {
    if (!draft || typeof draft !== 'object') return null;
    const owner = Number(draft.ownerUserId);
    if (Number.isInteger(owner) && owner > 0 && owner !== userId) return null;
    return { ...draft, ownerUserId: userId };
}

/** One-time import: only records explicitly owned by this user (never unowned org-wide rows). */
async function importOwnedSelfAssessmentsFromOrgStore(actorId) {
    const orgRootUserId = await resolveActorOrgRootId(actorId);
    const orgRow = await prisma.orgSelfAssessmentStore.findUnique({
        where: { orgRootUserId },
    });
    if (!orgRow) return [];
    return filterSelfAssessmentsForUser(orgRow.assessments, actorId);
}

async function ensureUserSelfAssessmentStore(actorId) {
    let row = await prisma.userSelfAssessmentStore.findUnique({ where: { userId: actorId } });
    if (!row) {
        let assessments = await importOwnedSelfAssessmentsFromOrgStore(actorId);
        let draft = null;
        try {
            const legacyRows = await prisma.$queryRaw`
                SELECT assessments, draft FROM "UserSelfAssessmentStore" WHERE "userId" = ${actorId}
            `;
            if (legacyRows?.length) {
                const legacy = legacyRows[0];
                assessments = stampSelfAssessmentsForUser(
                    filterSelfAssessmentsForUser(legacy.assessments, actorId),
                    actorId,
                );
                draft = selfAssessmentDraftForUser(legacy.draft, actorId);
            }
        } catch (err) {
            if (err?.code !== 'P2010' && err?.code !== '42P01') {
                console.warn('Legacy user self-assessment read skipped:', err?.message || err);
            }
        }
        row = await prisma.userSelfAssessmentStore.create({
            data: { userId: actorId, assessments, draft },
        });
    }
    let assessments = filterSelfAssessmentsForUser(row.assessments, actorId);
    const draft = selfAssessmentDraftForUser(row.draft, actorId);
    const storedLen = Array.isArray(row.assessments) ? row.assessments.length : 0;
    if (assessments.length !== storedLen || draft !== row.draft) {
        row = await prisma.userSelfAssessmentStore.update({
            where: { userId: actorId },
            data: {
                assessments: stampSelfAssessmentsForUser(assessments, actorId),
                draft,
            },
        });
        assessments = filterSelfAssessmentsForUser(row.assessments, actorId);
    }
    return { userId: actorId, assessments, draft, row };
}

/** Org-wide visibility for audit programs. */
function buildOrgSubtreeProgramVisibilityOr(subtreeIds) {
    if (!subtreeIds.length) return [{ userId: -1 }];
    return [
        { userId: { in: subtreeIds } },
        { leadAuditorId: { in: subtreeIds } },
        { auditors: { some: { id: { in: subtreeIds } } } },
        { user: { is: { creatorId: { in: subtreeIds } } } },
        { user: { is: { id: { in: subtreeIds } } } }
    ];
}

/** Org-wide visibility for audit plans (includes linked programs). */
function buildOrgSubtreePlanVisibilityOr(subtreeIds) {
    if (!subtreeIds.length) return [{ userId: -1 }];
    return [
        ...buildOrgSubtreeProgramVisibilityOr(subtreeIds),
        { auditProgram: { is: { userId: { in: subtreeIds } } } },
        { auditProgram: { is: { leadAuditorId: { in: subtreeIds } } } },
        { auditProgram: { is: { auditors: { some: { id: { in: subtreeIds } } } } } }
    ];
}

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Root route to prevent 404
app.get('/', (req, res) => {
    res.send('AuditMate Backend is running.');
});

// Admin Route to manually force DB Schema push 
app.get('/admin/upgrade-db', (req, res) => {
    try {
        console.log('Manual DB upgrade requested...');
        const outputPush = execSync('npx prisma db push --accept-data-loss', { encoding: 'utf-8' });
        const outputGen = execSync('npx prisma generate', { encoding: 'utf-8' });

        res.status(200).send(`<pre>Database Synchronized Successfully!\n\n${outputPush}\n\n${outputGen}\n\nServer is automatically restarting to load the new schema. Please wait 5 seconds and refresh your app!</pre>`);

        // Force PM2 to restart this process so V8 memory reloads the new Prisma Client
        setTimeout(() => {
            console.log("Restarting process to apply Prisma schema...");
            process.exit(0);
        }, 1000);
    } catch (error) {
        console.error('Manual manual DB sync failed:', error);
        res.status(500).send(`<pre>Failed to synchronize database:\n\n${error.message}\n\n${error.stdout || ''}\n${error.stderr || ''}</pre>`);
    }
});

// Example route to get all companies (including sites and departments)
app.get('/companies', authenticateToken, checkTrialExpiration, async (req, res) => {
    const actorId = Number(req.user?.id);
    if (!Number.isInteger(actorId) || actorId < 1) {
        return res.status(401).json({ error: 'Invalid session. Please log in again.' });
    }

    const { admin } = req.query;
    const rawQueryUserId = req.query.userId;

    console.log(`[DEBUG] GET /companies called for actor: ${actorId}, admin: ${admin}`);

    try {
        const viewer = await prisma.user.findUnique({
            where: { id: actorId },
            select: { role: true }
        });
        if (!viewer) {
            return res.status(401).json({ error: 'User not found.' });
        }

        // Reject cross-tenant ?userId= probing unless platform superadmin.
        let explicitOwnerId = null;
        if (rawQueryUserId !== undefined && rawQueryUserId !== null && String(rawQueryUserId).trim() !== '') {
            explicitOwnerId = Number.parseInt(String(rawQueryUserId), 10);
            if (Number.isNaN(explicitOwnerId) || explicitOwnerId < 1) {
                return res.status(400).json({ error: 'Invalid userId' });
            }
            if (explicitOwnerId !== actorId && viewer.role !== 'superadmin') {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        if (admin === 'true') {
            if (viewer.role !== 'superadmin') {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const companies = await prisma.company.findMany({
                include: {
                    sites: {
                        include: { departments: true }
                    }
                }
            });
            console.log(`[DEBUG] Fetched ${companies.length} companies for superadmin (admin=all).`);
            return res.json(companies);
        }

        if (normalizeUserRole(viewer.role) === 'auditee') {
            const assignedSites = await prisma.site.findMany({
                where: { userId: actorId },
                include: {
                    departments: true,
                    company: true,
                },
                orderBy: [{ name: 'asc' }],
            });
            const companyMap = new Map();
            for (const site of assignedSites) {
                const company = site.company;
                if (!company) continue;
                if (!companyMap.has(company.id)) {
                    const { sites: _s, ...companyBase } = company;
                    companyMap.set(company.id, { ...companyBase, sites: [] });
                }
                const { company: _c, ...siteRow } = site;
                companyMap.get(company.id).sites.push(siteRow);
            }
            return res.json(Array.from(companyMap.values()));
        }

        let ownerUserIds;
        if (viewer.role === 'superadmin' && explicitOwnerId != null) {
            ownerUserIds = [explicitOwnerId];
        } else {
            const orgRootId = await getOrgRootUserId(actorId);
            ownerUserIds =
                orgRootId != null ? await collectOrgSubtreeUserIds(orgRootId) : [actorId];
        }

        if (ownerUserIds.length === 0) {
            return res.json([]);
        }

        const companies = await prisma.company.findMany({
            where: { userId: { in: ownerUserIds } },
            include: {
                sites: {
                    include: { departments: true }
                }
            }
        });

        console.log(`[DEBUG] Successfully fetched ${companies.length} companies for allowed owners.`);
        res.json(companies);
    } catch (error) {
        console.error('Failed to fetch companies:', error);
        res.status(500).json({ error: 'Failed to fetch companies', details: error.message || String(error) });
    }
});

// Create a site
app.post('/companies/:companyId/sites', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { companyId } = req.params;
    const actorId = Number(req.user.id);
    const {
        name, description, siteType, status,
        address, city, state, country, postalCode,
        latitude, longitude, contactName, contactPosition,
        contactNumber, email
    } = req.body;
    try {
        const cid = Number.parseInt(companyId, 10);
        if (Number.isNaN(cid)) {
            return res.status(400).json({ error: 'Invalid company id' });
        }
        const company = await prisma.company.findUnique({ where: { id: cid }, select: { userId: true } });
        if (!company || company.userId == null) {
            return res.status(404).json({ error: 'Company not found' });
        }
        if (!(await actorCanAccessTargetUser(actorId, company.userId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const siteNameLenErr = organizationTextLengthError(name, SITE_TEXT_LIMITS.name, 'Site name');
        if (siteNameLenErr) {
            return res.status(400).json({ error: siteNameLenErr });
        }
        const sName = sanitizeOrganizationText(name, SITE_TEXT_LIMITS.name);
        if (!sName) {
            return res.status(400).json({ error: 'Site name is required' });
        }

        const sitePhone = sanitizePhoneField(contactNumber);
        if (!sitePhone) {
            return res.status(400).json({
                error: `Contact number must be exactly ${PHONE_DIGITS_LENGTH} digits (no letters or extra characters).`
            });
        }

        const site = await prisma.site.create({
            data: {
                name: sName,
                description: sanitizePlainText(description, SITE_TEXT_LIMITS.description, { preserveNewlines: true }),
                siteType: sanitizePlainText(siteType, SITE_TEXT_LIMITS.siteType),
                status: sanitizePlainText(status, SITE_TEXT_LIMITS.status) || 'Active',
                address: sanitizeOrganizationText(address, SITE_TEXT_LIMITS.address),
                city: sanitizePlainText(city, SITE_TEXT_LIMITS.city),
                state: sanitizePlainText(state, SITE_TEXT_LIMITS.state),
                country: sanitizePlainText(country, SITE_TEXT_LIMITS.country),
                postalCode: sanitizePlainText(postalCode, SITE_TEXT_LIMITS.postalCode),
                latitude: latitude != null && String(latitude).trim() !== '' && !Number.isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null,
                longitude: longitude != null && String(longitude).trim() !== '' && !Number.isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null,
                contactName: sanitizePlainText(contactName, SITE_TEXT_LIMITS.contactName),
                contactPosition: sanitizePlainText(contactPosition, SITE_TEXT_LIMITS.contactPosition),
                contactNumber: sitePhone,
                email: sanitizePlainText(email, SITE_TEXT_LIMITS.email),
                companyId: cid,
                // userId is reserved for auditee assignment, not company ownership
                userId: null,
            }
        });
        res.status(201).json(site);
    } catch (error) {
        console.error('Error creating site:', error);
        res.status(500).json({ error: 'Failed to create site', details: error.message || String(error) });
    }
});

// Get sites for companies in the actor's organization (same scope as GET /companies).
app.get('/sites', authenticateToken, checkTrialExpiration, async (req, res) => {
    const actorId = Number(req.user.id);
    if (!Number.isInteger(actorId) || actorId < 1) {
        return res.json([]);
    }

    try {
        if (await actorIsAuditee(actorId)) {
            const sites = await prisma.site.findMany({
                where: { userId: actorId },
                include: { company: true },
                orderBy: [{ name: 'asc' }],
            });
            return res.json(sites);
        }

        const orgRootId = await getOrgRootUserId(actorId);
        const ownerUserIds =
            orgRootId != null ? await collectOrgSubtreeUserIds(orgRootId) : [actorId];
        if (ownerUserIds.length === 0) {
            return res.json([]);
        }

        const sites = await prisma.site.findMany({
            where: {
                company: { userId: { in: ownerUserIds } },
            },
            include: { company: true },
            orderBy: [{ name: 'asc' }],
        });
        res.json(sites);
    } catch (error) {
        console.error('Failed to fetch sites:', error);
        res.status(500).json({ error: 'Failed to fetch sites' });
    }
});

// Update a site
app.put('/sites/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const {
        name, description, siteType, status,
        address, city, state, country, postalCode,
        latitude, longitude, contactName, contactPosition,
        contactNumber, email
    } = req.body;
    try {
        const data = {};
        if (name !== undefined) {
            const siteNameLenErr = organizationTextLengthError(name, SITE_TEXT_LIMITS.name, 'Site name');
            if (siteNameLenErr) {
                return res.status(400).json({ error: siteNameLenErr });
            }
            const sName = sanitizeOrganizationText(name, SITE_TEXT_LIMITS.name);
            if (!sName) {
                return res.status(400).json({ error: 'Site name is required' });
            }
            data.name = sName;
        }
        if (description !== undefined) {
            data.description = sanitizePlainText(description, SITE_TEXT_LIMITS.description, { preserveNewlines: true });
        }
        if (siteType !== undefined) {
            data.siteType = sanitizePlainText(siteType, SITE_TEXT_LIMITS.siteType);
        }
        if (status !== undefined) {
            data.status = sanitizePlainText(status, SITE_TEXT_LIMITS.status);
        }
        if (address !== undefined) {
            data.address = sanitizeOrganizationText(address, SITE_TEXT_LIMITS.address);
        }
        if (city !== undefined) {
            data.city = sanitizePlainText(city, SITE_TEXT_LIMITS.city);
        }
        if (state !== undefined) {
            data.state = sanitizePlainText(state, SITE_TEXT_LIMITS.state);
        }
        if (country !== undefined) {
            data.country = sanitizePlainText(country, SITE_TEXT_LIMITS.country);
        }
        if (postalCode !== undefined) {
            data.postalCode = sanitizePlainText(postalCode, SITE_TEXT_LIMITS.postalCode);
        }
        if (latitude !== undefined || longitude !== undefined) {
            data.latitude =
                latitude != null && String(latitude).trim() !== '' && !Number.isNaN(parseFloat(latitude))
                    ? parseFloat(latitude)
                    : null;
            data.longitude =
                longitude != null && String(longitude).trim() !== '' && !Number.isNaN(parseFloat(longitude))
                    ? parseFloat(longitude)
                    : null;
        }
        if (contactName !== undefined) {
            data.contactName = sanitizePlainText(contactName, SITE_TEXT_LIMITS.contactName);
        }
        if (contactPosition !== undefined) {
            data.contactPosition = sanitizePlainText(contactPosition, SITE_TEXT_LIMITS.contactPosition);
        }
        if (contactNumber !== undefined) {
            const cn = sanitizePhoneField(contactNumber);
            if (!cn) {
                return res.status(400).json({
                    error: `Contact number must be exactly ${PHONE_DIGITS_LENGTH} digits (no letters or extra characters).`
                });
            }
            data.contactNumber = cn;
        }
        if (email !== undefined) {
            data.email = sanitizePlainText(email, SITE_TEXT_LIMITS.email);
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const site = await prisma.site.update({
            where: { id: Number.parseInt(id) },
            data
        });
        res.json(site);
    } catch (error) {
        console.error('Error updating site:', error);
        res.status(500).json({ error: 'Failed to update site' });
    }
});

// Delete a site
app.delete('/sites/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.site.delete({
            where: { id: Number.parseInt(id) }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting site:', error);
        res.status(500).json({ error: 'Failed to delete site' });
    }
});

// Create a department
app.post('/sites/:siteId/departments', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { siteId } = req.params;
    const { name, code, status, manager, description } = req.body;
    try {
        const deptNameLenErr = organizationTextLengthError(name, DEPT_TEXT_LIMITS.name, 'Department name');
        if (deptNameLenErr) {
            return res.status(400).json({ error: deptNameLenErr });
        }
        const dName = sanitizeOrganizationText(name, DEPT_TEXT_LIMITS.name);
        if (!dName) {
            return res.status(400).json({ error: 'Department name is required' });
        }

        const department = await prisma.department.create({
            data: {
                name: dName,
                code: sanitizePlainText(code, DEPT_TEXT_LIMITS.code),
                status: sanitizePlainText(status, DEPT_TEXT_LIMITS.status) || 'Active',
                manager: sanitizePlainText(manager, DEPT_TEXT_LIMITS.manager),
                description: sanitizePlainText(description, DEPT_TEXT_LIMITS.description, { preserveNewlines: true }),
                siteId: Number.parseInt(siteId)
            }
        });
        res.status(201).json(department);
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
});

// Update a department
app.put('/departments/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const { name, code, status, manager, description } = req.body;
    try {
        const data = {};
        if (name !== undefined) {
            const deptNameLenErr = organizationTextLengthError(name, DEPT_TEXT_LIMITS.name, 'Department name');
            if (deptNameLenErr) {
                return res.status(400).json({ error: deptNameLenErr });
            }
            const dName = sanitizeOrganizationText(name, DEPT_TEXT_LIMITS.name);
            if (!dName) {
                return res.status(400).json({ error: 'Department name is required' });
            }
            data.name = dName;
        }
        if (code !== undefined) {
            data.code = sanitizePlainText(code, DEPT_TEXT_LIMITS.code);
        }
        if (status !== undefined) {
            data.status = sanitizePlainText(status, DEPT_TEXT_LIMITS.status);
        }
        if (manager !== undefined) {
            data.manager = sanitizePlainText(manager, DEPT_TEXT_LIMITS.manager);
        }
        if (description !== undefined) {
            data.description = sanitizePlainText(description, DEPT_TEXT_LIMITS.description, { preserveNewlines: true });
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const department = await prisma.department.update({
            where: { id: Number.parseInt(id) },
            data
        });
        res.json(department);
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: 'Failed to update department' });
    }
});

// Delete a department
app.delete('/departments/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.department.delete({
            where: { id: Number.parseInt(id) }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ error: 'Failed to delete department' });
    }
});

// Example route to create a company
app.post('/companies', authenticateToken, checkTrialExpiration, async (req, res) => {
    const userId = req.user.id;
    const {
        name, industry, description, logo,
        contactNumber, streetAddress, city,
        state, country, postalCode, standards
    } = req.body;
    try {
        const parsedUserId = userId;

        // Enforce One Company Per User Rule
        if (parsedUserId) {
            const existingCompany = await prisma.company.findFirst({
                where: { userId: parsedUserId }
            });
            if (existingCompany) {
                return res.status(400).json({ error: 'User already has a registered company. Only one company is allowed per user.' });
            }
        }

        const sName = sanitizeOrganizationText(name, COMPANY_TEXT_LIMITS.name);
        if (!sName) {
            return res.status(400).json({ error: 'Company name is required' });
        }

        const sCity = sanitizePlainText(city, COMPANY_TEXT_LIMITS.city);
        const sCountry = sanitizePlainText(country, COMPANY_TEXT_LIMITS.country);

        const companyPhone = sanitizePhoneField(contactNumber);
        if (!companyPhone) {
            return res.status(400).json({
                error: `Contact number must be exactly ${PHONE_DIGITS_LENGTH} digits (no letters or extra characters).`
            });
        }

        const sanitizedLogo =
            logo === undefined || logo === null || logo === ''
                ? undefined
                : sanitizeLogoField(logo, COMPANY_TEXT_LIMITS.logo);
        if (logo && sanitizedLogo === null) {
            return res.status(400).json({ error: 'Logo image is too large. Use a smaller file (under 10MB).' });
        }
        if (logo && sanitizedLogo === '') {
            return res.status(400).json({ error: 'Invalid logo image. Use PNG or JPEG.' });
        }

        const company = await prisma.company.create({
            data: {
                name: sName,
                industry: sanitizePlainText(industry, COMPANY_TEXT_LIMITS.industry),
                description: sanitizePlainText(description, COMPANY_TEXT_LIMITS.description, { preserveNewlines: true }),
                logo: sanitizedLogo,
                contactNumber: companyPhone,
                streetAddress: sanitizeOrganizationText(streetAddress, COMPANY_TEXT_LIMITS.streetAddress),
                city: sCity,
                state: sanitizePlainText(state, COMPANY_TEXT_LIMITS.state),
                country: sCountry,
                postalCode: sanitizePlainText(postalCode, COMPANY_TEXT_LIMITS.postalCode),
                isoStandards: sanitizeStringArray(standards),
                // Automatically set legacy fields for compatibility
                location: `${sCity || ''}, ${sCountry || ''}`.trim().replace(/^, |,$/, ''),
                contactDetails: companyPhone,
                userId: parsedUserId
            },
        });
        res.status(201).json(company);
    } catch (error) {
        console.error('Error creating company:', error);
        res.status(500).json({ error: 'Failed to create company' });
    }
});

// Update a company
app.put('/companies/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const actorId = Number(req.user.id);
    const {
        name, industry, description, logo,
        contactNumber, streetAddress, city,
        state, country, postalCode, standards
    } = req.body;
    try {
        const companyIdNum = Number.parseInt(id, 10);
        if (Number.isNaN(companyIdNum)) {
            return res.status(400).json({ error: 'Invalid company id' });
        }
        const existing = await prisma.company.findUnique({
            where: { id: companyIdNum },
            select: { userId: true, city: true, country: true, contactNumber: true }
        });
        if (!existing || existing.userId == null) {
            return res.status(404).json({ error: 'Company not found' });
        }
        if (!(await actorCanAccessTargetUser(actorId, existing.userId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const data = {};
        if (name !== undefined) {
            const s = sanitizeOrganizationText(name, COMPANY_TEXT_LIMITS.name);
            if (!s) {
                return res.status(400).json({ error: 'Company name is required' });
            }
            data.name = s;
        }
        if (industry !== undefined) {
            data.industry = sanitizePlainText(industry, COMPANY_TEXT_LIMITS.industry);
        }
        if (description !== undefined) {
            data.description = sanitizePlainText(description, COMPANY_TEXT_LIMITS.description, { preserveNewlines: true });
        }
        if (logo !== undefined) {
            if (logo === null || logo === '') {
                data.logo = null;
            } else {
                const sanitizedLogo = sanitizeLogoField(logo, COMPANY_TEXT_LIMITS.logo);
                if (sanitizedLogo === null) {
                    return res.status(400).json({ error: 'Logo image is too large. Use a smaller file (under 10MB).' });
                }
                if (sanitizedLogo === '') {
                    return res.status(400).json({ error: 'Invalid logo image. Use PNG or JPEG.' });
                }
                data.logo = sanitizedLogo;
            }
        }
        if (streetAddress !== undefined) {
            data.streetAddress = sanitizeOrganizationText(streetAddress, COMPANY_TEXT_LIMITS.streetAddress);
        }
        if (state !== undefined) {
            data.state = sanitizePlainText(state, COMPANY_TEXT_LIMITS.state);
        }
        if (postalCode !== undefined) {
            data.postalCode = sanitizePlainText(postalCode, COMPANY_TEXT_LIMITS.postalCode);
        }
        if (standards !== undefined) {
            data.isoStandards = sanitizeStringArray(standards);
        }
        if (contactNumber !== undefined) {
            const cn = sanitizePhoneField(contactNumber);
            if (!cn) {
                return res.status(400).json({
                    error: `Contact number must be exactly ${PHONE_DIGITS_LENGTH} digits (no letters or extra characters).`
                });
            }
            data.contactNumber = cn;
            data.contactDetails = cn;
        }
        if (city !== undefined) {
            data.city = sanitizePlainText(city, COMPANY_TEXT_LIMITS.city);
        }
        if (country !== undefined) {
            data.country = sanitizePlainText(country, COMPANY_TEXT_LIMITS.country);
        }
        if (city !== undefined || country !== undefined) {
            const effCity = data.city !== undefined ? data.city : existing.city;
            const effCountry = data.country !== undefined ? data.country : existing.country;
            data.location = `${effCity || ''}, ${effCountry || ''}`.trim().replace(/^, |,$/, '');
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const company = await prisma.company.update({
            where: { id: Number.parseInt(id) },
            data
        });
        res.json(company);
    } catch (error) {
        console.error('Error updating company:', error);
        res.status(500).json({ error: 'Failed to update company' });
    }
});

// Delete a company
app.delete('/companies/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const actorId = Number(req.user.id);
    try {
        const companyIdNum = Number.parseInt(id, 10);
        if (Number.isNaN(companyIdNum)) {
            return res.status(400).json({ error: 'Invalid company id' });
        }
        const existing = await prisma.company.findUnique({
            where: { id: companyIdNum },
            select: { userId: true }
        });
        if (!existing || existing.userId == null) {
            return res.status(404).json({ error: 'Company not found' });
        }
        if (!(await actorCanAccessTargetUser(actorId, existing.userId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.company.delete({
            where: { id: companyIdNum },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting company:', error);
        res.status(500).json({ error: 'Failed to delete company' });
    }
});

// -------------------------
// Auth & OTP Routes
// -------------------------

function getOtpTtlMinutes(purpose) {
    if (purpose === 'signup') return 1;
    if (purpose === 'password_reset' || purpose === 'email_change') return 15;
    if (purpose === 'user_invite') return 30;
    return 10;
}

function formatOtpExpiryLabel(ttlMinutes) {
    return ttlMinutes === 1 ? '1 minute' : `${ttlMinutes} minutes`;
}

function isSmtpConfigured() {
    const user = String(process.env.SMTP_USER || '').trim();
    const pass = String(process.env.SMTP_PASS || '').trim();
    return Boolean(user && pass);
}

const SMTP_FROM_DEFAULT = 'noreply@iaudit.global';

/** Envelope "from" address — SMTP_USER is auth credentials and may not be an email. */
function getSmtpFromAddress() {
    const explicit = String(process.env.SMTP_FROM_ADDRESS || '').trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(explicit)) return explicit;
    const authUser = String(process.env.SMTP_USER || '').trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authUser)) return authUser;
    return SMTP_FROM_DEFAULT;
}

function assertSmtpConfiguredForOtp() {
    if (!isSmtpConfigured()) {
        console.error('[OTP] SMTP_USER and SMTP_PASS must both be set to send verification emails.');
        throw new Error('EMAIL_NOT_CONFIGURED');
    }
}

/** Local dev: log OTP to server console when SMTP is not configured (signup still works). */
function allowDevConsoleOtp() {
    return process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_OTP_CONSOLE !== 'false';
}

/** normalizedEmail: lowercased + trimmed. purpose: signup | email_change | password_reset | user_invite */
async function sendOtpToEmailAddress(normalizedEmail, purpose, options = {}) {
    return runOtpSendExclusive(normalizedEmail, () =>
        withPgOtpAdvisoryLock(normalizedEmail, () =>
            sendOtpToEmailAddressUnderLock(normalizedEmail, purpose, options)
        )
    );
}

function getAppLoginUrl() {
    const base = String(process.env.FRONTEND_URL || 'http://localhost:8080').trim().replace(/\/$/, '');
    return `${base}/auth`;
}

/** Combined welcome email for admin-created users (credentials + verification code). */
function buildUserInviteWelcomeMailContent({
    normalizedEmail,
    firstName,
    lastName,
    password,
    otp,
    expireLabel
}) {
    const loginUrl = getAppLoginUrl();
    const safeName = escapeHtml(`${firstName} ${lastName}`.trim());
    const safeEmail = escapeHtml(normalizedEmail);
    const safePassword = escapeHtml(password);
    const safeLoginUrl = escapeHtml(loginUrl);
    const subject = 'Welcome to iAudit Global — verify your email and sign in';
    const text = [
        `Welcome to iAudit Global, ${firstName} ${lastName}!`,
        '',
        'An administrator created an account for you. Complete these steps:',
        '1. Open the sign-in page and enter the verification code below to confirm your email.',
        '2. After verification, sign in with the credentials below.',
        '',
        `Sign-in page: ${loginUrl}`,
        `Email (username): ${normalizedEmail}`,
        `Password: ${password}`,
        '',
        `Verification code: ${otp}`,
        `This code expires in ${expireLabel}.`,
        '',
        'If you did not expect this account, ignore this email.'
    ].join('\n');
    const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #00875b; font-size: 28px; margin: 0;">Welcome to iAudit Global</h1>
                    </div>
                    <p style="color: #374151; font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
                        Hello ${safeName},<br><br>
                        An administrator created an iAudit Global account for you. <strong>Verify your email first</strong>, then sign in with the credentials below.
                    </p>
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Your sign-in credentials</p>
                        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Sign-in page:</strong> <a href="${safeLoginUrl}" style="color: #00875b;">${safeLoginUrl}</a></p>
                        <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Email (username):</strong> ${safeEmail}</p>
                        <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Password:</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 4px; font-size: 14px;">${safePassword}</code></p>
                    </div>
                    <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
                        On the sign-in page, enter this verification code to confirm you own this inbox. You <strong>cannot sign in</strong> until your email is verified.
                    </p>
                    <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                        <p style="text-transform: uppercase; font-size: 14px; font-weight: 600; color: #6b7280; margin: 0 0 12px 0; letter-spacing: 1px;">Verification code</p>
                        <h2 style="font-size: 42px; font-weight: 800; color: #111827; letter-spacing: 8px; margin: 0;">${otp}</h2>
                    </div>
                    <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
                        This code expires in <strong>${escapeHtml(expireLabel)}</strong>. After verification, sign in with your email and password above. For security, consider changing your password after your first login.
                    </p>
                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
                    <div style="text-align: center; color: #9ca3af; font-size: 12px;">
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} iAudit Global. All rights reserved.</p>
                        <p style="margin: 4px 0 0 0;">This email was sent to ${safeEmail}. Please do not reply to this automated message.</p>
                    </div>
                </div>
            `;
    return { subject, text, html };
}

async function sendOtpToEmailAddressUnderLock(normalizedEmail, purpose, options = {}) {
    acquireOtpSendSlot(normalizedEmail);
    try {
        const lastOtp = await prisma.otp.findUnique({ where: { email: normalizedEmail } });
        if (lastOtp) {
            const lastSendAt = new Date(lastOtp.updatedAt || lastOtp.createdAt).getTime();
            const timeSinceLastOtp = Date.now() - lastSendAt;
            if (timeSinceLastOtp < OTP_RESEND_COOLDOWN_MS) {
                const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeSinceLastOtp) / 1000);
                throwOtpCooldownError(remainingSeconds);
            }
        }

        const otp = generateOTP();
        const devConsoleOnly = !isSmtpConfigured() && allowDevConsoleOtp();
        if (!devConsoleOnly) {
            assertSmtpConfiguredForOtp();
        }
        const ttlMinutes = getOtpTtlMinutes(purpose);
        const expireLabel = formatOtpExpiryLabel(ttlMinutes);
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        await prisma.otp.upsert({
            where: { email: normalizedEmail },
            update: { code: otp, expiresAt },
            create: { email: normalizedEmail, code: otp, expiresAt }
        });

        const isPasswordReset = purpose === 'password_reset';
        const isEmailChange = purpose === 'email_change';
        const isUserInvite = purpose === 'user_invite';
        const welcomeCreds = options.welcomeCredentials;
        const useInviteWelcome =
            isUserInvite &&
            welcomeCreds &&
            typeof welcomeCreds.password === 'string' &&
            welcomeCreds.password.length > 0;

        let subject;
        let text;
        let html;
        if (useInviteWelcome) {
            const welcomeMail = buildUserInviteWelcomeMailContent({
                normalizedEmail,
                firstName: welcomeCreds.firstName || '',
                lastName: welcomeCreds.lastName || '',
                password: welcomeCreds.password,
                otp,
                expireLabel
            });
            subject = welcomeMail.subject;
            text = welcomeMail.text;
            html = welcomeMail.html;
        } else {
            subject = isPasswordReset
                ? 'Reset your iAudit Global password'
                : isEmailChange
                  ? 'Verify your new iAudit email'
                  : isUserInvite
                    ? 'Verify your iAudit Global account'
                    : 'Your Account Verification Code';
            const titleHtml = isPasswordReset
                ? 'Password reset'
                : isEmailChange
                  ? 'Confirm your email'
                  : isUserInvite
                    ? 'Activate your account'
                    : 'Welcome to iAudit Global';
            const introHtml = isPasswordReset
                ? 'You requested to reset your password. Use the verification code below to continue. If you did not request this, you can ignore this email.'
                : isEmailChange
                  ? 'Use the verification code below to confirm you can receive email at this address. An administrator requested this address for your account.'
                  : isUserInvite
                    ? 'An administrator created an iAudit Global account for this email address. Enter the verification code below on the sign-in page to confirm you own this inbox. You must verify before you can sign in.'
                    : 'Please use the verification code below to confirm your email address and complete your signup securely:';
            text = isPasswordReset
                ? `Your password reset code is: ${otp}. This code expires in ${expireLabel}.`
                : isEmailChange
                  ? `Your email verification code is: ${otp}. This code expires in ${expireLabel}.`
                  : isUserInvite
                    ? `Your account activation code is: ${otp}. This code expires in ${expireLabel}. Sign in at ${getAppLoginUrl()} after verification.`
                    : `Your verification code is: ${otp}. This code will expire in ${expireLabel}.`;
            html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #00875b; font-size: 28px; margin: 0;">${titleHtml}</h1>
                    </div>
                    <p style="color: #374151; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                        Hello!<br><br>
                        ${introHtml}
                    </p>
                    <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 32px;">
                        <p style="text-transform: uppercase; font-size: 14px; font-weight: 600; color: #6b7280; margin: 0 0 12px 0; letter-spacing: 1px;">Verification code</p>
                        <h2 style="font-size: 42px; font-weight: 800; color: #111827; letter-spacing: 8px; margin: 0;">${otp}</h2>
                    </div>
                    <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
                        This code will expire in <strong>${expireLabel}</strong>. If you did not request this, you can ignore this email.
                    </p>
                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
                    <div style="text-align: center; color: #9ca3af; font-size: 12px;">
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} iAudit Global. All rights reserved.</p>
                        <p style="margin: 4px 0 0 0;">This email was sent to ${normalizedEmail}. Please do not reply to this automated message.</p>
                    </div>
                </div>
            `;
        }

    const smtpFrom = String(process.env.SMTP_USER).trim();
    const mailOptions = {
        from: {
            name: 'iAudit Global',
            address: smtpFrom
        },
        to: normalizedEmail,
        subject,
        headers: { 'X-Entity-Ref-ID': otp },
        text,
        html
    };

        let emailTransmitted = false;
        try {
            if (devConsoleOnly) {
                console.log('\n====================================================================');
                console.log(`[DEV OTP] ${purpose} for ${normalizedEmail}: ${otp}`);
                console.log(`          Expires in ${ttlMinutes} minutes (SMTP not configured).`);
                console.log('====================================================================\n');
                emailTransmitted = true;
            } else {
                await transporter.sendMail(mailOptions);
                emailTransmitted = true;
                console.log(`OTP successfully sent to ${normalizedEmail}`);
            }
        } catch (emailError) {
            console.error('Email sending failed:', emailError.message);
            if (allowDevConsoleOtp()) {
                console.log('\n====================================================================');
                console.log(`[DEV OTP] ${purpose} for ${normalizedEmail}: ${otp}`);
                console.log(`          Expires in ${ttlMinutes} minutes (email send failed; use code above).`);
                console.log('====================================================================\n');
                emailTransmitted = true;
            } else {
                await prisma.otp.delete({ where: { email: normalizedEmail } }).catch(() => {});
                if (String(emailError.message || '').includes('5.7.139')) {
                    console.error('\n====================================================================');
                    console.error('     🚨 CRITICAL: MICROSOFT 365 SECURITY BLOCK DETECTED 🚨');
                    console.error('====================================================================');
                    console.error('Exact Issue: Microsoft Office 365 has disabled Basic Authentication');
                    console.error('             (SMTP AUTH) for the account "noreply@iaudit.global".');
                    console.error('');
                    console.error('HOW TO FIX THIS (Required Admin Action):');
                    console.error('  1. Log in to admin.microsoft.com as a Global Administrator.');
                    console.error('  2. Go to Users > Active users.');
                    console.error('  3. Click on the user: noreply@iaudit.global');
                    console.error('  4. Click the "Mail" tab on the right side window.');
                    console.error('  5. Click "Manage email apps".');
                    console.error('  6. Check the box for "Authenticated SMTP" and save changes.');
                    console.error('  7. Wait 15-30 minutes for Microsoft to apply the policy.');
                    console.error('====================================================================\n');
                }
                const err = new Error('EMAIL_SEND_FAILED');
                err.smtpDetail = emailError.message;
                throw err;
            }
        }
        return { emailTransmitted };
    } finally {
        releaseOtpSendSlot(normalizedEmail);
    }
}

// Alias for signup if frontend calls /auth/signup directly
const sendOtpLogic = async (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid request body' });
    }
    let { email } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email is required' });
    }
    email = email.toLowerCase().trim();

    let step = 'Lookup existing user';
    try {
        console.log(`[AUTH] Signup attempt`);
        const existingUser = await prisma.user.findFirst({ where: { email } });
        console.log(`[AUTH] User lookup result:`, existingUser ? 'Found' : 'Not Found');
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        step = 'Send OTP';
        await sendOtpToEmailAddress(email, 'signup');
        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        if (error.message === 'OTP_COOLDOWN') {
            res.setHeader('Retry-After', String(error.retryAfterSeconds));
            return res.status(429).json({
                error: `Please wait ${error.retryAfterSeconds} seconds before requesting another code.`,
                retryAfterSeconds: error.retryAfterSeconds
            });
        }
        if (error.message === 'EMAIL_NOT_CONFIGURED') {
            return res.status(503).json({
                error: 'Email delivery is not configured. Please contact support.'
            });
        }
        if (error.message === 'EMAIL_SEND_FAILED') {
            console.error('[AUTH] OTP email send failed:', error.smtpDetail);
            return res.status(503).json({
                error: 'We could not send the verification email. Check spam or junk, wait a few minutes, and try again.'
            });
        }
        handlePrismaError(error, `sendOtpLogic at step: ${step}`);
        res.status(500).json({
            error: `Failed during: ${step}`,
            message: error.message,
            code: error.code,
            step: step
        });
    }
};

const authJson = express.json({ limit: '50mb' });

app.post('/api/auth/send-otp', authJson, sendOtpIpRateLimit, sendOtpLogic);
app.post('/api/auth/signup', authJson, sendOtpIpRateLimit, sendOtpLogic);
app.post('/auth/send-otp', sendOtpIpRateLimit, sendOtpLogic);
app.post('/auth/signup', sendOtpIpRateLimit, sendOtpLogic);
mountedApiRouter.post('/auth/send-otp', sendOtpIpRateLimit, sendOtpLogic);
mountedApiRouter.post('/auth/signup', sendOtpIpRateLimit, sendOtpLogic);

app.post('/auth/verify-otp-and-signup', async (req, res) => {
    const badKeys = getDisallowedExtraKeysError(req.body, SIGNUP_COMPLETE_ALLOWED_BODY_KEYS);
    if (badKeys) {
        return res.status(400).json({ error: badKeys });
    }

    let { email, otp, firstName, lastName, mobile, password } = req.body;
    console.log(`[AUTH] Signup attempt for ${email}, password length: ${password?.length}`);

    if (!email || !otp || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email and OTP are required' });
    }
    email = email.toLowerCase().trim();

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    if (!PASSWORD_REGEX.test(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.' });
    }

    const fn = sanitizePersonName(firstName, PERSON_NAME_MAX);
    const ln = sanitizePersonName(lastName, PERSON_NAME_MAX);
    if (!fn || !ln) {
        return res.status(400).json({ error: 'Valid first name and last name are required (letters and common punctuation only).' });
    }

    const mobileDigits = sanitizePhoneField(mobile);
    if (!mobileDigits) {
        return res.status(400).json({
            error: `Mobile number is required and must be exactly ${PHONE_DIGITS_LENGTH} digits.`
        });
    }

    const storedData = await prisma.otp.findFirst({ where: { email } });

    if (!storedData) {
        return res.status(400).json({ error: 'No OTP requested for this email' });
    }

    if (new Date() > storedData.expiresAt) {
        await prisma.otp.delete({ where: { email } });
        return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedData.code !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    try {
        // OTP is valid! Create the user.
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                firstName: fn,
                lastName: ln,
                email,
                mobile: mobileDigits,
                role: 'admin',
                creatorId: null,
                isActive: true,
                emailVerifiedAt: new Date(),
                password: hashedPassword,
            },
        });

        // Clean up OTP from database
        await prisma.otp.delete({ where: { email } });

        await ensureUserTrialStarted(user.id);

        const profile = await prisma.user.findUnique({
            where: { id: user.id },
            select: LOGIN_SUCCESS_USER_SELECT
        });
        if (!profile || profile.email.toLowerCase().trim() !== email) {
            return res.status(500).json({ error: 'Account creation could not be completed' });
        }

        const { token, sessionExpiresAt } = await createSessionTokenForUser(profile.id);

        res.status(201).json({ ...profile, token, sessionExpiresAt });
    } catch (error) {
        console.error('Error creating user during OTP verification:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});

const INVITE_VERIFY_ALLOWED_KEYS = new Set(['email', 'otp']);

async function handleVerifyInvitedAccount(req, res) {
    const badKeys = getDisallowedExtraKeysError(req.body, INVITE_VERIFY_ALLOWED_KEYS);
    if (badKeys) {
        return res.status(400).json({ error: badKeys });
    }
    let { email, otp } = req.body;
    if (!email || !otp || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email and verification code are required' });
    }
    email = email.toLowerCase().trim();
    const otpRaw = String(otp).trim();

    try {
        const user = await prisma.user.findFirst({
            where: { email },
            select: { id: true, emailVerifiedAt: true, creatorId: true, isActive: true }
        });
        if (!user) {
            return res.status(400).json({ error: 'Invalid verification request' });
        }
        if (user.creatorId == null) {
            return res.status(400).json({ error: 'This account does not require invite verification' });
        }
        if (user.emailVerifiedAt) {
            return res.status(200).json({ ok: true, message: 'Email is already verified. You can sign in.' });
        }

        const storedData = await prisma.otp.findFirst({ where: { email } });
        if (!storedData) {
            return res.status(400).json({ error: 'No verification code found. Ask your administrator to resend it.' });
        }
        if (new Date() > storedData.expiresAt) {
            await prisma.otp.delete({ where: { email } }).catch(() => {});
            return res.status(400).json({ error: 'Verification code has expired. Request a new code.' });
        }
        if (storedData.code !== otpRaw) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { emailVerifiedAt: new Date(), isActive: true }
            }),
            prisma.otp.delete({ where: { email } })
        ]);

        res.json({ ok: true, message: 'Email verified. You can now sign in.' });
    } catch (error) {
        console.error('Error verifying invited account:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
}

async function handleResendInviteVerification(req, res) {
    const badKeys = getDisallowedExtraKeysError(req.body, new Set(['email']));
    if (badKeys) {
        return res.status(400).json({ error: badKeys });
    }
    let { email } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email is required' });
    }
    email = email.toLowerCase().trim();
    const emailFmt = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailFmt.test(email) || email.length > 254) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    try {
        const user = await prisma.user.findFirst({
            where: { email },
            select: { id: true, emailVerifiedAt: true, creatorId: true }
        });
        if (!user || user.creatorId == null || user.emailVerifiedAt) {
            return res.json({
                message: 'If this account is pending verification, a new code has been sent.'
            });
        }

        await sendOtpToEmailAddress(email, 'user_invite');
        res.json({ message: 'Verification code sent.' });
    } catch (error) {
        if (error.code === 'OTP_COOLDOWN') {
            return res.status(429).json({
                error: error.message,
                retryAfterSeconds: error.retryAfterSeconds
            });
        }
        if (error.message === 'EMAIL_NOT_CONFIGURED') {
            return res.status(503).json({ error: 'Email service is not configured' });
        }
        console.error('Error resending invite verification:', error);
        res.status(500).json({ error: 'Failed to send verification code' });
    }
}

app.post('/api/auth/verify-invited-account', authJson, sendOtpIpRateLimit, handleVerifyInvitedAccount);
app.post('/auth/verify-invited-account', sendOtpIpRateLimit, handleVerifyInvitedAccount);
app.post('/api/auth/resend-invite-verification', authJson, sendOtpIpRateLimit, handleResendInviteVerification);
app.post('/auth/resend-invite-verification', sendOtpIpRateLimit, handleResendInviteVerification);
mountedApiRouter.post('/auth/verify-invited-account', sendOtpIpRateLimit, handleVerifyInvitedAccount);
mountedApiRouter.post('/auth/resend-invite-verification', sendOtpIpRateLimit, handleResendInviteVerification);

app.post('/auth/login', loginIpRateLimit, async (req, res) => {
    const badKeys = getDisallowedExtraKeysError(req.body, LOGIN_ALLOWED_BODY_KEYS);
    if (badKeys) {
        return res.status(400).json({ error: badKeys });
    }

    let { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Valid email and password are required' });
    }
    if (email.length > 254 || password.length > 256) {
        return res.status(401).json({ error: LOGIN_INVALID_CREDENTIALS_MESSAGE });
    }
    email = email.toLowerCase().trim();

    const invalidCredentials = () => res.status(401).json({ error: LOGIN_INVALID_CREDENTIALS_MESSAGE });
    const accountLockedResponse = () =>
        res.status(403).json({
            error: `Too many failed login attempts. Use "Forgot password" to reset your password and unlock your account (limit: ${LOGIN_MAX_FAILED_ATTEMPTS} attempts).`,
            code: 'ACCOUNT_LOCKED_PASSWORD_RESET_REQUIRED'
        });

    try {
        console.log(`[AUTH] Login attempt`);
        const user = await prisma.user.findFirst({
            where: { email: email },
            select: {
                id: true,
                email: true,
                password: true,
                isActive: true,
                failedLoginAttempts: true,
                emailVerifiedAt: true,
                creatorId: true
            }
        });

        if (!user) {
            console.log(`[AUTH] Login failed: User not found`);
            return invalidCredentials();
        }
        console.log(`[AUTH] User found for login: ${user.id}`);

        if ((user.failedLoginAttempts ?? 0) >= LOGIN_MAX_FAILED_ATTEMPTS) {
            return accountLockedResponse();
        }

        // Use bcrypt to compare the provided password with the hashed password in DB
        let isPasswordMatch = false;
        try {
            isPasswordMatch = await bcrypt.compare(password, user.password);
        } catch (error) {
            isPasswordMatch = false;
        }

        if (!isPasswordMatch) {
            // Fallback: check plain text (for existing users not yet migrated to hashing)
            if (user.password === password) {
                // Migration: hash and save the password for future logins
                const hashedPassword = await bcrypt.hash(password, 10);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { password: hashedPassword, failedLoginAttempts: 0 }
                });
                isPasswordMatch = true;
            } else {
                const afterFail = await prisma.user.update({
                    where: { id: user.id },
                    data: { failedLoginAttempts: { increment: 1 } },
                    select: { failedLoginAttempts: true }
                });
                if (afterFail.failedLoginAttempts >= LOGIN_MAX_FAILED_ATTEMPTS) {
                    return accountLockedResponse();
                }
                return invalidCredentials();
            }
        }

        if (!user.isActive) {
            if (user.creatorId != null && !user.emailVerifiedAt) {
                return res.status(403).json({
                    error: 'Please verify your email before signing in. Check your inbox for the activation code from your administrator.',
                    code: 'EMAIL_VERIFICATION_REQUIRED',
                    email
                });
            }
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        if (!user.emailVerifiedAt && user.creatorId != null) {
            return res.status(403).json({
                error: 'Please verify your email before signing in. Enter the activation code sent to your inbox.',
                code: 'EMAIL_VERIFICATION_REQUIRED',
                email
            });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0 }
        }).catch(() => {});

        await ensureUserTrialStarted(user.id);

        const profile = await prisma.user.findUnique({
            where: { id: user.id },
            select: LOGIN_SUCCESS_USER_SELECT
        });
        if (!profile || profile.email.toLowerCase().trim() !== email) {
            return res.status(500).json({ error: 'Login could not be completed' });
        }

        const { token, sessionExpiresAt } = await createSessionTokenForUser(profile.id);

        console.log(`[AUTH] Login successful for user: ${profile.id}, onboardingCompleted: ${profile.onboardingCompleted}`);
        res.status(200).json({ ...profile, token, sessionExpiresAt });

    } catch (error) {
        handlePrismaError(error, 'login');
        res.status(500).json({ error: 'An error occurred during login' });
    }
});

async function handleForgotPassword(req, res) {
    const badKeys = getDisallowedExtraKeysError(req.body, FORGOT_PASSWORD_ALLOWED_BODY_KEYS);
    if (badKeys) {
        return res.status(400).json({ error: badKeys });
    }
    let { email } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email is required' });
    }
    email = email.toLowerCase().trim();
    const emailFmt = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailFmt.test(email) || email.length > 254) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const sent = { message: 'A verification code has been sent to your email.' };

    try {
        const user = await prisma.user.findFirst({ where: { email }, select: { id: true, isActive: true } });
        if (!user) {
            // Same response as success so callers cannot enumerate registered emails.
            return res.status(200).json(sent);
        }
        if (!user.isActive) {
            return res.status(200).json(sent);
        }
        await sendOtpToEmailAddress(email, 'password_reset');
        return res.status(200).json(sent);
    } catch (error) {
        if (error.message === 'OTP_COOLDOWN') {
            res.setHeader('Retry-After', String(error.retryAfterSeconds));
            return res.status(429).json({
                error: `Please wait ${error.retryAfterSeconds} seconds before requesting another code.`,
                retryAfterSeconds: error.retryAfterSeconds
            });
        }
        if (error.message === 'EMAIL_NOT_CONFIGURED') {
            console.error('forgot-password: SMTP_USER / SMTP_PASS missing');
            return res.status(503).json({
                error: 'Email delivery is not configured. Please contact support.'
            });
        }
        if (error.message === 'EMAIL_SEND_FAILED') {
            console.error('forgot-password: SMTP send failed:', error.smtpDetail);
            return res.status(503).json({
                error: 'We could not send the verification email. Check spam or junk, wait a few minutes, and try again. If the problem continues, contact support.'
            });
        }
        console.error('forgot-password error:', error);
        return res.status(500).json({ error: 'Could not process request' });
    }
}

async function handleResetPassword(req, res) {
    const badKeys = getDisallowedExtraKeysError(req.body, RESET_PASSWORD_ALLOWED_BODY_KEYS);
    if (badKeys) {
        return res.status(400).json({ error: badKeys });
    }
    let { email, otp, newPassword } = req.body;
    if (!email || typeof email !== 'string' || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, verification code, and new password are required' });
    }
    if (typeof otp !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ error: 'Invalid request' });
    }
    email = email.toLowerCase().trim();
    const otpTrim = String(otp).trim();
    if (!PASSWORD_REGEX.test(newPassword)) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.'
        });
    }

    try {
        const user = await prisma.user.findFirst({ where: { email }, select: { id: true, isActive: true } });
        if (!user || !user.isActive) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        const storedData = await prisma.otp.findFirst({ where: { email } });
        if (!storedData) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }
        if (new Date(storedData.expiresAt) < new Date()) {
            await prisma.otp.delete({ where: { email } }).catch(() => {});
            return res.status(400).json({ error: 'Verification code has expired. Request a new code.' });
        }
        if (storedData.code !== otpTrim) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword, failedLoginAttempts: 0 }
            }),
            prisma.otp.delete({ where: { email } }),
            prisma.session.deleteMany({ where: { userId: user.id } })
        ]);

        return res.status(200).json({ message: 'Password has been reset. You can sign in with your new password.' });
    } catch (error) {
        console.error('reset-password error:', error);
        return res.status(500).json({ error: 'Could not reset password' });
    }
}

app.post('/auth/forgot-password', sendOtpIpRateLimit, handleForgotPassword);
app.post('/auth/reset-password', handleResetPassword);

/** Invalidate every server session for this user (all devices/browsers). */
async function handleLogout(req, res) {
    try {
        const userId = Number.parseInt(String(req.user?.id), 10);
        if (!Number.isInteger(userId) || userId < 1) {
            return res.status(401).json({ error: 'Invalid session. Please log in again.' });
        }
        const { count } = await prisma.session.deleteMany({ where: { userId } });
        console.log(`[AUTH] Logout: removed ${count} session(s) for user ${userId}`);
        res.status(204).send();
    } catch (error) {
        console.error('[AUTH] Logout error:', error);
        res.status(500).json({ error: 'Failed to log out' });
    }
}

app.post('/api/auth/logout', authenticateToken, handleLogout);
app.post('/auth/logout', authenticateToken, handleLogout);
mountedApiRouter.post('/auth/logout', authenticateToken, handleLogout);

const SUPER_ADMIN_USER_LIST_SELECT = {
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
    firstLoginAt: true,
    lastLoginAt: true,
    subscriptionStatus: true,
    trialEndDate: true
};

/** @returns {Promise<{ id: number, role: string } | null>} viewer or null if response already sent */
async function requirePlatformSuperAdmin(req, res) {
    const actorId = Number(req.user?.id);
    if (!Number.isInteger(actorId) || actorId < 1) {
        res.status(401).json({ error: 'Invalid session. Please log in again.' });
        return null;
    }
    const viewer = await prisma.user.findUnique({
        where: { id: actorId },
        select: { id: true, role: true }
    });
    if (!viewer) {
        res.status(401).json({ error: 'User not found.' });
        return null;
    }
    if (viewer.role !== 'superadmin') {
        res.status(403).json({ error: 'Forbidden' });
        return null;
    }
    return viewer;
}

/** Super Admin console — all platform users (no ?scope= query param required). */
app.get('/super-admin/users', authenticateToken, async (req, res) => {
    try {
        if (!(await requirePlatformSuperAdmin(req, res))) return;
        const users = await prisma.user.findMany({
            select: SUPER_ADMIN_USER_LIST_SELECT,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
        });
        res.json(users);
    } catch (error) {
        console.error('Failed to fetch super-admin users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/** Super Admin console — all companies with sites/departments. */
app.get('/super-admin/companies', authenticateToken, async (req, res) => {
    try {
        if (!(await requirePlatformSuperAdmin(req, res))) return;
        const companies = await prisma.company.findMany({
            include: {
                sites: {
                    include: { departments: true }
                }
            },
            orderBy: { id: 'asc' }
        });
        res.json(companies);
    } catch (error) {
        console.error('Failed to fetch super-admin companies:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

// User routes — never return the whole user table; scope to org or explicit superadmin ?scope=all.
// `?creatorId=` may only narrow results; it cannot be used to read another tenant's users (IDOR).
app.get('/users', authenticateToken, async (req, res) => {
    const actorId = Number(req.user?.id);
    if (!Number.isInteger(actorId) || actorId < 1) {
        return res.status(401).json({ error: 'Invalid session. Please log in again.' });
    }
    try {
        const viewer = await prisma.user.findUnique({
            where: { id: actorId },
            select: { id: true, role: true }
        });
        if (!viewer) {
            return res.status(401).json({ error: 'User not found.' });
        }

        if (normalizeUserRole(viewer.role) === 'auditee') {
            return res.json([]);
        }

        const scopeAll =
            viewer.role === 'superadmin' &&
            (String(req.query.scope || '') === 'all' ||
                String(req.headers['x-super-admin-console'] || '').toLowerCase() === 'true');

        let filterCreatorId = null;
        const rawCreator = req.query.creatorId;
        if (rawCreator !== undefined && rawCreator !== null && String(rawCreator).trim() !== '') {
            const c = Number.parseInt(String(rawCreator), 10);
            if (Number.isNaN(c) || c < 1) {
                return res.status(400).json({ error: 'Invalid creatorId' });
            }
            // Only self, users you may administer, or platform superadmin (scope=all) may scope by creator.
            const mayUseCreatorFilter =
                scopeAll || c === actorId || (await actorCanAccessTargetUser(actorId, c));
            if (!mayUseCreatorFilter) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            filterCreatorId = c;
        }

        let allowedIds;
        if (scopeAll) {
            const all = await prisma.user.findMany({ select: { id: true } });
            allowedIds = all.map((u) => u.id);
        } else {
            const orgRootId = await getOrgRootUserId(actorId);
            allowedIds = await collectOrgSubtreeUserIds(orgRootId);
        }

        if (allowedIds.length === 0) {
            return res.json([]);
        }

        const whereBase = {
            id: { in: allowedIds },
            role: { not: 'auditee' },
        };
        const where =
            filterCreatorId != null ? { ...whereBase, creatorId: filterCreatorId } : whereBase;

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
                role: true,
                customRoleName: true,
                isActive: true,
                emailVerifiedAt: true,
                createdAt: true
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
        });
        res.json(users);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.get('/users/lookup-by-email', authenticateToken, async (req, res) => {
    const actorId = Number(req.user?.id);
    if (!Number.isInteger(actorId) || actorId < 1) {
        return res.status(401).json({ error: 'Invalid session. Please log in again.' });
    }
    try {
        const result = await findUserByEmail(req.query.email);
        if (result.error) {
            return res.status(result.status || 400).json({ error: result.error });
        }
        return res.json(result);
    } catch (error) {
        console.error('Failed to lookup user by email:', error);
        return res.status(500).json({ error: 'Failed to lookup user' });
    }
});

// Get single user status quickly (never return PII or raw Stripe price IDs)
app.get('/users/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const targetId = Number.parseInt(id, 10);
    if (Number.isNaN(targetId)) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    const actorId = Number(req.user.id);
    try {
        if (!(await actorCanViewUserBillingStatus(actorId, targetId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const [viewer, user] = await Promise.all([
            prisma.user.findUnique({ where: { id: actorId }, select: { role: true } }),
            prisma.user.findUnique({
                where: { id: targetId },
                select: {
                    id: true,
                    isActive: true,
                    trialStartDate: true,
                    trialEndDate: true,
                    subscriptionStatus: true,
                    subscriptionPlan: true,
                    planStartDate: true,
                    planExpiryDate: true,
                    nextBillingDate: true,
                    stripePriceId: true,
                    renewalType: true,
                    autopayConsent: true,
                    onboardingCompleted: true
                }
            })
        ]);

        if (!user) {
            return res.json({ exists: false, isActive: false });
        }

        let currentStatus = user.subscriptionStatus;
        if (currentStatus === 'trial' && user.trialEndDate && new Date(user.trialEndDate) < new Date()) {
            currentStatus = 'expired';
        }

        const viewingSelf = actorId === targetId;
        const fullBilling = viewingSelf || viewer?.role === 'superadmin';

        // Org admin / delegate: only coarse flags — no billing internals, payment history, or plan details
        if (!fullBilling) {
            return res.json({
                exists: true,
                isActive: user.isActive,
                subscriptionStatus: currentStatus,
                onboardingCompleted: user.onboardingCompleted
            });
        }

        const latestPayment = await prisma.payment.findFirst({
            where: { userId: user.id, status: 'paid' },
            orderBy: { createdAt: 'desc' },
            select: { duration: true }
        });

        const priceIdLower = user.stripePriceId ? String(user.stripePriceId).toLowerCase() : '';
        const isMonthlyPlan = priceIdLower.includes('month') || user.nextBillingDate != null;

        res.json({
            exists: true,
            isActive: user.isActive,
            subscriptionStatus: currentStatus,
            trialEndDate: user.trialEndDate,
            trialStartDate: user.trialStartDate,
            subscriptionPlan: user.subscriptionPlan,
            planStartDate: user.planStartDate,
            planExpiryDate: user.planExpiryDate,
            nextBillingDate: user.nextBillingDate,
            isMonthlyPlan,
            renewalType: user.renewalType,
            autopayConsent: user.autopayConsent,
            onboardingCompleted: user.onboardingCompleted,
            duration: latestPayment?.duration || null
        });
    } catch (error) {
        console.error('Failed to fetch user status:', error);
        res.status(500).json({ error: 'Failed to fetch user status' });
    }
});

app.post('/users/:id/resend-verification', authenticateToken, async (req, res) => {
    const targetId = Number.parseInt(req.params.id, 10);
    const actorId = Number(req.user.id);
    if (Number.isNaN(targetId)) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    try {
        if (!(await actorCanManageOrgUsers(actorId))) {
            return res.status(403).json({ error: 'Forbidden', message: 'Only administrators can resend verification.' });
        }
        if (!(await actorCanAccessTargetUser(actorId, targetId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const user = await prisma.user.findUnique({
            where: { id: targetId },
            select: { email: true, emailVerifiedAt: true, creatorId: true }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.creatorId == null) {
            return res.status(400).json({ error: 'This user does not require invite verification' });
        }
        if (user.emailVerifiedAt) {
            return res.status(400).json({ error: 'Email is already verified' });
        }
        await sendOtpToEmailAddress(user.email.toLowerCase().trim(), 'user_invite');
        res.json({ message: 'Verification code sent.' });
    } catch (error) {
        if (error.code === 'OTP_COOLDOWN') {
            return res.status(429).json({ error: error.message, retryAfterSeconds: error.retryAfterSeconds });
        }
        console.error('Error resending user verification:', error);
        res.status(500).json({ error: 'Failed to send verification code' });
    }
});

app.get('/users/invite-auditee/access', authenticateToken, async (req, res) => {
    const actorId = Number(req.user.id);
    try {
        const [allowed, isCompanyAdmin, isLeadAuditor] = await Promise.all([
            actorCanInviteAuditee(actorId),
            actorCanManageOrgUsers(actorId),
            actorIsLeadAuditor(actorId),
        ]);
        res.json({ allowed, isCompanyAdmin, isLeadAuditor });
    } catch (error) {
        console.error('Error checking invite auditee access:', error);
        res.status(500).json({ error: 'Failed to check access' });
    }
});

app.get('/users/auditees', authenticateToken, async (req, res) => {
    const actorId = Number(req.user.id);
    if (!(await actorCanInviteAuditee(actorId))) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const orgRootId = await getOrgRootUserId(actorId);
        const allowedIds =
            orgRootId != null ? await collectOrgSubtreeUserIds(orgRootId) : [actorId];
        if (allowedIds.length === 0) {
            return res.json([]);
        }

        const auditees = await prisma.user.findMany({
            where: {
                id: { in: allowedIds },
                role: 'auditee',
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
                role: true,
                isActive: true,
                emailVerifiedAt: true,
                createdAt: true,
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });

        if (auditees.length === 0) {
            return res.json([]);
        }

        const auditeeIds = auditees.map((u) => u.id);
        const sites = await prisma.site.findMany({
            where: { userId: { in: auditeeIds } },
            select: {
                id: true,
                name: true,
                userId: true,
                company: { select: { name: true } },
            },
            orderBy: { name: 'asc' },
        });
        const sitesByAuditeeId = new Map();
        for (const site of sites) {
            if (site.userId == null) continue;
            const uid = Number(site.userId);
            if (!sitesByAuditeeId.has(uid)) sitesByAuditeeId.set(uid, []);
            sitesByAuditeeId.get(uid).push(site);
        }

        res.json(
            auditees.map((u) => {
                const assigned = sitesByAuditeeId.get(u.id) ?? [];
                const siteIds = assigned.map((s) => s.id);
                const siteLabels = assigned.map(
                    (s) => `${s.name} (${s.company?.name ?? 'Company'})`,
                );
                const primary = assigned[0];
                return {
                    ...u,
                    siteIds,
                    siteLabels,
                    siteId: primary?.id ?? null,
                    siteLabel: siteLabels.length > 0 ? siteLabels.join(', ') : null,
                };
            }),
        );
    } catch (error) {
        console.error('Error listing auditees:', error);
        res.status(500).json({ error: 'Failed to list auditees' });
    }
});

app.post('/users/invite-auditee', authenticateToken, async (req, res) => {
    const creatorId = Number(req.user.id);
    if (!(await actorCanInviteAuditee(creatorId))) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Only company administrators and lead auditors can invite auditees.',
        });
    }

    const {
        email,
        mobile,
        password,
        siteId,
        siteIds: rawSiteIds,
        firstName: rawFirst,
        lastName: rawLast,
        sendWelcomeEmail,
    } = req.body ?? {};

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }
    if (!PASSWORD_REGEX.test(password)) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.',
        });
    }

    const emailNorm =
        typeof email === 'string' ? (sanitizePlainText(email.trim().toLowerCase(), 254) || '') : '';
    const emailFmt = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailFmt.test(emailNorm)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const userMobile = sanitizePhoneField(mobile);
    if (!userMobile) {
        return res.status(400).json({
            error: `Mobile number is required and must be exactly ${PHONE_DIGITS_LENGTH} digits.`,
        });
    }

    const parsedSiteIds = parseAuditeeSiteIds({ siteIds: rawSiteIds, siteId });
    if (!parsedSiteIds) {
        return res.status(400).json({ error: 'At least one valid site is required' });
    }
    for (const sid of parsedSiteIds) {
        if (!(await actorCanAssignAuditeeToSite(creatorId, sid))) {
            return res.status(403).json({ error: 'You cannot assign an auditee to one or more selected sites' });
        }
    }

    const defaults = defaultAuditeeNamesFromEmail(emailNorm);
    const fn = sanitizePersonName(rawFirst, PERSON_NAME_MAX) || defaults.firstName;
    const ln = sanitizePersonName(rawLast, PERSON_NAME_MAX) || defaults.lastName;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.$transaction(async (tx) => {
            const sites = await tx.site.findMany({
                where: { id: { in: parsedSiteIds } },
                select: { id: true, userId: true, user: { select: { role: true } } },
            });
            if (sites.length !== parsedSiteIds.length) {
                const err = new Error('Site not found');
                err.code = 'SITE_NOT_FOUND';
                throw err;
            }
            for (const site of sites) {
                if (siteUserIsAuditee(site)) {
                    const err = new Error('Site already assigned');
                    err.code = 'SITE_ALREADY_ASSIGNED';
                    throw err;
                }
            }
            for (const site of sites) {
                if (site.userId != null) {
                    await tx.site.update({
                        where: { id: site.id },
                        data: { userId: null },
                    });
                }
            }

            const created = await tx.user.create({
                data: {
                    firstName: fn,
                    lastName: ln,
                    email: emailNorm,
                    mobile: userMobile,
                    role: 'auditee',
                    isActive: false,
                    emailVerifiedAt: null,
                    password: hashedPassword,
                    creatorId: Number.isInteger(creatorId) ? creatorId : null,
                },
            });

            await assignAuditeeToSites(tx, created.id, parsedSiteIds);

            return created;
        });

        let verificationEmailSent = false;
        let welcomeEmailSent = false;
        const inviteEmailOptions = sendWelcomeEmail !== false
            ? { welcomeCredentials: { firstName: fn, lastName: ln, password } }
            : {};
        try {
            const { emailTransmitted } = await sendOtpToEmailAddress(
                emailNorm,
                'user_invite',
                inviteEmailOptions,
            );
            verificationEmailSent = emailTransmitted === true;
            welcomeEmailSent = Boolean(sendWelcomeEmail !== false && verificationEmailSent);
        } catch (otpErr) {
            console.error('Failed to send auditee invite email:', otpErr);
        }

        const siteLabels = await formatAuditeeSiteLabels(parsedSiteIds);
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({
            ...userWithoutPassword,
            siteIds: parsedSiteIds,
            siteLabels,
            siteId: parsedSiteIds[0] ?? null,
            emailVerificationPending: true,
            verificationEmailSent,
            welcomeEmailSent,
        });
    } catch (error) {
        console.error('Error inviting auditee:', error);
        if (error.code === 'SITE_NOT_FOUND') {
            return res.status(404).json({ error: 'Site not found' });
        }
        if (error.code === 'SITE_ALREADY_ASSIGNED') {
            return res.status(409).json({
                error: 'Site already assigned',
                message:
                    'One or more selected sites are already assigned to another auditee. Unassign them or choose different sites.',
            });
        }
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to invite auditee' });
    }
});

app.patch('/users/:id/auditee-site', authenticateToken, async (req, res) => {
    const targetId = Number.parseInt(req.params.id, 10);
    const actorId = Number(req.user.id);
    if (Number.isNaN(targetId)) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    if (!(await actorCanManageAuditee(actorId, targetId))) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const parsedSiteIds = parseAuditeeSiteIds(req.body);
    if (!parsedSiteIds) {
        return res.status(400).json({ error: 'At least one valid site is required' });
    }
    for (const sid of parsedSiteIds) {
        if (!(await actorCanAssignAuditeeToSite(actorId, sid))) {
            return res.status(403).json({ error: 'You cannot assign an auditee to one or more selected sites' });
        }
    }

    try {
        await prisma.$transaction(async (tx) => {
            await assignAuditeeToSites(tx, targetId, parsedSiteIds);
        });

        const siteLabels = await formatAuditeeSiteLabels(parsedSiteIds);
        res.json({
            siteIds: parsedSiteIds,
            siteLabels,
            siteId: parsedSiteIds[0] ?? null,
            siteLabel: siteLabels.join(', ') || null,
        });
    } catch (error) {
        console.error('Error assigning auditee site:', error);
        if (error.code === 'SITE_NOT_FOUND') {
            return res.status(404).json({ error: 'Site not found' });
        }
        if (error.code === 'SITE_ALREADY_ASSIGNED') {
            return res.status(409).json({
                error: 'Site already assigned',
                message:
                    'One or more selected sites are already assigned to another auditee. Unassign them or choose different sites.',
            });
        }
        res.status(500).json({ error: 'Failed to assign site' });
    }
});

app.post('/users', authenticateToken, async (req, res) => {
    const { firstName, lastName, email, mobile, role, customRoleName, password, sendWelcomeEmail } = req.body;
    const creatorId = req.user.id;
    if (!(await actorCanManageOrgUsers(creatorId))) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Only administrators can create users.'
        });
    }
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }
    if (!PASSWORD_REGEX.test(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.' });
    }

    const fn = sanitizePersonName(firstName, PERSON_NAME_MAX);
    const ln = sanitizePersonName(lastName, PERSON_NAME_MAX);
    if (!fn || !ln) {
        return res.status(400).json({ error: 'First name and last name are required' });
    }

    const emailNorm =
        typeof email === 'string' ? (sanitizePlainText(email.trim().toLowerCase(), 254) || '') : '';
    const emailFmt = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailFmt.test(emailNorm)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const userMobile = sanitizePhoneField(mobile);
    if (!userMobile) {
        return res.status(400).json({
            error: `Mobile number is required and must be exactly ${PHONE_DIGITS_LENGTH} digits.`
        });
    }

    try {
        const roleNorm = normalizeUserRole(sanitizeShortLabel(role, 80) || 'auditor');
        if (!USER_ASSIGNABLE_ROLES.has(roleNorm)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const user = await prisma.user.create({
            data: {
                firstName: fn,
                lastName: ln,
                email: emailNorm,
                mobile: userMobile,
                role: roleNorm,
                customRoleName: sanitizeShortLabel(customRoleName, 120),
                isActive: false,
                emailVerifiedAt: null,
                password: await bcrypt.hash(password, 10),
                creatorId: creatorId ? Number.parseInt(creatorId) : null
            }
        });

        let verificationEmailSent = false;
        let welcomeEmailSent = false;
        const inviteEmailOptions = sendWelcomeEmail !== false
            ? { welcomeCredentials: { firstName: fn, lastName: ln, password } }
            : {};
        try {
            const { emailTransmitted } = await sendOtpToEmailAddress(
                emailNorm,
                'user_invite',
                inviteEmailOptions
            );
            verificationEmailSent = emailTransmitted === true;
            welcomeEmailSent = Boolean(sendWelcomeEmail !== false && verificationEmailSent);
        } catch (otpErr) {
            console.error('Failed to send invite onboarding email:', otpErr);
        }

        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({
            ...userWithoutPassword,
            emailVerificationPending: true,
            verificationEmailSent,
            welcomeEmailSent
        });
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});


async function postUserEmailChangeSendOtp(req, res) {
    const targetId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    const actorId = Number(req.user?.id);
    if (Number.isNaN(actorId)) {
        return res.status(401).json({ error: 'Invalid session. Please log in again.' });
    }
    let { newEmail } = req.body;
    if (!newEmail || typeof newEmail !== 'string') {
        return res.status(400).json({ error: 'Valid new email is required' });
    }
    newEmail = newEmail.toLowerCase().trim();
    const emailFmt = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailFmt.test(newEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    try {
        if (!(await actorCanAccessTargetUser(actorId, targetId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const target = await prisma.user.findUnique({ where: { id: targetId } });
        if (!target) {
            return res.status(404).json({ error: 'User not found' });
        }
        const currentNorm = (target.email || '').toLowerCase().trim();
        if (currentNorm === newEmail) {
            return res.status(400).json({ error: 'This is already the user\'s current email' });
        }
        const taken = await prisma.user.findFirst({
            where: { email: newEmail, NOT: { id: targetId } }
        });
        if (taken) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        await sendOtpToEmailAddress(newEmail, 'email_change');
        res.status(200).json({ message: 'Verification code sent' });
    } catch (error) {
        if (error.message === 'OTP_COOLDOWN') {
            res.setHeader('Retry-After', String(error.retryAfterSeconds));
            return res.status(429).json({
                error: `Please wait ${error.retryAfterSeconds} seconds before requesting another code.`,
                retryAfterSeconds: error.retryAfterSeconds
            });
        }
        if (error.message === 'EMAIL_NOT_CONFIGURED') {
            return res.status(503).json({ error: 'Email delivery is not configured on this server.' });
        }
        if (error.message === 'EMAIL_SEND_FAILED') {
            console.error('email-change send-otp SMTP error:', error.smtpDetail);
            return res.status(503).json({
                error: 'We could not send the verification email. Check spam or junk and try again.'
            });
        }
        console.error('email-change send-otp error:', error);
        const hint =
            /updatedAt|Otp|does not exist|Unknown column|P2022/i.test(String(error?.message || ''))
                ? 'Database may be out of date. Run: npx prisma migrate deploy (or rebuild the server container).'
                : undefined;
        res.status(500).json({
            error: 'Failed to send verification code',
            detail: error?.message || String(error),
            hint
        });
    }
}

// Under `/api` before strip (see `mountedApiRouter` at top). JSON body: this stack runs before global `express.json`.
mountedApiRouter.post(
    '/users/:id/email-change/send-otp',
    express.json({ limit: '50mb' }),
    authenticateToken,
    postUserEmailChangeSendOtp
);
app.post('/users/:id/email-change/send-otp', authenticateToken, postUserEmailChangeSendOtp);

app.put('/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const targetId = Number.parseInt(id, 10);
    if (Number.isNaN(targetId)) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    const { firstName, lastName, email, mobile, role, customRoleName, isActive, password, onboardingCompleted, emailChangeOtp } = req.body;
    const actorId = Number(req.user.id);
    try {
        if (!(await actorCanAccessTargetUser(actorId, targetId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const canManageUsers = await actorCanManageOrgUsers(actorId);
        const canManageAuditee = await actorCanManageAuditee(actorId, targetId);

        const targetUser = await prisma.user.findUnique({
            where: { id: targetId },
            select: { email: true, role: true }
        });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const targetRoleNorm = normalizeUserRole(targetUser.role);

        if (!canManageUsers && targetId !== actorId) {
            if (!(canManageAuditee && targetRoleNorm === 'auditee')) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Only administrators can edit other users.'
                });
            }
        }

        const actorRow = await prisma.user.findUnique({
            where: { id: actorId },
            select: { role: true }
        });
        if (
            targetRoleNorm === 'superadmin' &&
            normalizeUserRole(actorRow?.role) !== 'superadmin'
        ) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const privilegeFieldsRequested =
            role !== undefined ||
            customRoleName !== undefined ||
            (isActive !== undefined && targetId !== actorId);
        if (privilegeFieldsRequested && !canManageUsers) {
            if (!(canManageAuditee && targetRoleNorm === 'auditee')) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Only administrators can change user roles or account status.'
                });
            }
            if (role !== undefined || customRoleName !== undefined) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Only administrators can change user roles.'
                });
            }
        }

        const oldNorm = targetUser.email.toLowerCase().trim();
        const incomingNorm =
            email != null && typeof email === 'string'
                ? (sanitizePlainText(email.trim().toLowerCase(), 254) || oldNorm)
                : oldNorm;
        const emailFmt = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailFmt.test(incomingNorm)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        if (incomingNorm !== oldNorm) {
            const otpRaw = emailChangeOtp != null ? String(emailChangeOtp).trim() : '';
            if (!otpRaw) {
                return res.status(400).json({ error: 'Verification code required to change email address' });
            }
            const storedData = await prisma.otp.findFirst({ where: { email: incomingNorm } });
            if (!storedData) {
                return res.status(400).json({ error: 'No verification code for this email. Send a new code first.' });
            }
            if (new Date(storedData.expiresAt) < new Date()) {
                await prisma.otp.delete({ where: { email: incomingNorm } }).catch(() => {});
                return res.status(400).json({ error: 'Verification code has expired. Send a new code.' });
            }
            if (storedData.code !== otpRaw) {
                return res.status(400).json({ error: 'Invalid verification code' });
            }
            await prisma.otp.delete({ where: { email: incomingNorm } });
            const emailTaken = await prisma.user.findFirst({
                where: { email: incomingNorm, NOT: { id: targetId } }
            });
            if (emailTaken) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        }

        const updateData = {
            email: incomingNorm,
            onboardingCompleted: onboardingCompleted !== undefined ? onboardingCompleted : undefined
        };
        if (incomingNorm !== oldNorm) {
            updateData.emailVerifiedAt = new Date();
        }

        if (isActive !== undefined) {
            updateData.isActive = isActive;
        }

        if (firstName !== undefined) {
            const fn = sanitizePersonName(firstName, PERSON_NAME_MAX);
            if (!fn) {
                return res.status(400).json({ error: 'Invalid first name' });
            }
            updateData.firstName = fn;
        }
        if (lastName !== undefined) {
            const ln = sanitizePersonName(lastName, PERSON_NAME_MAX);
            if (!ln) {
                return res.status(400).json({ error: 'Invalid last name' });
            }
            updateData.lastName = ln;
        }
        if (mobile !== undefined) {
            const raw = typeof mobile === 'string' ? mobile.trim() : '';
            if (raw === '') {
                updateData.mobile = null;
            } else {
                const m = sanitizePhoneField(mobile);
                if (!m) {
                    return res.status(400).json({
                        error: `Mobile number must be exactly ${PHONE_DIGITS_LENGTH} digits.`
                    });
                }
                updateData.mobile = m;
            }
        }
        if (role !== undefined && role !== null) {
            const r = normalizeUserRole(sanitizeShortLabel(role, 80));
            if (!r || !USER_ASSIGNABLE_ROLES.has(r)) {
                return res.status(400).json({ error: 'Invalid role' });
            }
            updateData.role = r;
        }
        if (customRoleName !== undefined) {
            updateData.customRoleName =
                customRoleName === null ? null : sanitizeShortLabel(customRoleName, 120);
        }

        if (password) {
            if (!PASSWORD_REGEX.test(password)) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.' });
            }
            updateData.password = await bcrypt.hash(password, 10);
            updateData.failedLoginAttempts = 0;
        }

        const user = await prisma.user.update({
            where: { id: targetId },
            data: updateData
        });

        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error updating user:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const targetId = Number.parseInt(id, 10);
    if (Number.isNaN(targetId)) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    const actorId = Number(req.user.id);
    try {
        // Enforce org-hierarchy access (prevents deleting users outside actor's org subtree).
        // `actorCanAccessTargetUser` already allows the superadmin role.
        if (!(await actorCanAccessTargetUser(actorId, targetId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const canDeleteAuditee = await actorCanManageAuditee(actorId, targetId);
        const canManageOrgUsers = await actorCanManageOrgUsers(actorId);
        // Auditee deletion is stricter; other user roles fall back to org-user permissions.
        if (!(canDeleteAuditee || canManageOrgUsers)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You cannot delete this user.',
            });
        }
        if (targetId === actorId) {
            return res.status(400).json({
                error: 'You cannot delete your own account while signed in. Sign out or use another admin account.'
            });
        }

        const target = await prisma.user.findUnique({
            where: { id: targetId },
            select: { role: true }
        });
        if (target && normalizeUserRole(target.role) === 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await deleteUserCompletely(targetId);
        console.log(`[AUTH] User ${targetId} deleted by actor ${actorId}`);
        res.status(204).send();
    } catch (error) {
        if (error.code === 'USER_NOT_FOUND') {
            return res.status(404).json({ error: 'User not found' });
        }
        if (error.code === 'INVALID_ID') {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        console.error('Error deleting user:', error);
        res.status(500).json({
            error: 'Failed to delete user',
            message: error.message
        });
    }
});

// Audit Program routes
app.post('/users/:id/start-trial', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const targetId = Number.parseInt(id, 10);
    if (Number.isNaN(targetId)) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    try {
        const actor = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { role: true }
        });
        if (actor?.role !== 'superadmin' && req.user.id !== targetId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const existing = await prisma.user.findUnique({
            where: { id: targetId },
            select: { trialStartDate: true, trialEndDate: true, subscriptionStatus: true, role: true }
        });
        if (!existing) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (existing.role === 'superadmin') {
            return res.status(400).json({ error: 'Trial is not available for this account' });
        }
        if (existing.subscriptionStatus === 'active') {
            return res.status(400).json({ error: 'User already has an active subscription' });
        }
        if (existing.trialEndDate) {
            const full = await prisma.user.findUnique({
                where: { id: targetId },
                select: LOGIN_SUCCESS_USER_SELECT
            });
            if (!full) {
                return res.status(404).json({ error: 'User not found' });
            }
            return res.json(full);
        }

        const trialStartDate = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialStartDate.getDate() + TRIAL_DURATION_DAYS);

        const user = await prisma.user.update({
            where: { id: targetId },
            data: {
                trialStartDate,
                trialEndDate,
                subscriptionStatus: 'trial'
            }
        });

        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Failed to start trial:', error);
        res.status(500).json({ error: 'Failed to start trial' });
    }
});

// Audit Program routes
app.get('/audit-programs', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { userId, full } = req.query;

    try {
        const actorId = req.user.id;
        let programWhere;

        if (await actorIsAuditee(actorId)) {
            const siteIds = await getAuditeeAssignedSiteIds(actorId);
            programWhere = siteIds.length > 0 ? { siteId: { in: siteIds } } : { id: -1 };
        } else {
        const useOrgScope =
            String(req.query.scope || '') === 'org' ||
            !userId ||
            userId === 'undefined' ||
            userId === 'null';

        if (useOrgScope && req.user.role !== 'superadmin') {
            const orgRootId = await resolveActorOrgRootId(actorId);
            if (!(await actorCanReadOrgAssessmentStore(actorId, orgRootId))) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            const subtreeIds = await collectOrgSubtreeUserIds(orgRootId);
            programWhere = { OR: buildOrgSubtreeProgramVisibilityOr(subtreeIds) };
        } else {
            let scopeUserId;
            if (userId && userId !== 'undefined' && userId !== 'null') {
                scopeUserId = Number.parseInt(String(userId), 10);
            } else {
                scopeUserId = actorId;
            }
            if (Number.isNaN(scopeUserId)) {
                return res.status(400).json({ error: 'Invalid userId' });
            }
            if (!(await actorCanAccessTargetUser(actorId, scopeUserId))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const parsedUserId = scopeUserId;
            const user = await prisma.user.findUnique({ where: { id: parsedUserId } });
            const effectiveAdminId = user?.creatorId || parsedUserId;

            programWhere = {
                OR: [
                    { userId: parsedUserId },
                    { leadAuditorId: parsedUserId },
                    { auditors: { some: { id: parsedUserId } } },
                    { user: { is: { creatorId: parsedUserId } } },
                    { user: { is: { id: effectiveAdminId } } },
                    { user: { is: { creatorId: effectiveAdminId } } }
                ]
            };
        }
        }

        const programs = await prisma.auditProgram.findMany({
            where: programWhere,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                isoStandard: true,
                frequency: true,
                duration: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                siteId: true,
                site: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                leadAuditor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                auditors: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                scheduleData: true
            }
        });
        if (programs.length > 0) {
            console.log(`[DEBUG] First program owners: userId=${programs[0].userId}, leadAuditorId=${programs[0].leadAuditorId}`);
            console.log(`[DEBUG] First program auditors:`, JSON.stringify(programs[0].auditors.map(a => a.id)));
        }
        // Map to include a simple boolean for UI and optionally strip full data to save bandwidth
        const optimizedPrograms = programs.map(p => {
            const isConfigured = p.scheduleData && typeof p.scheduleData === 'object' && Object.keys(p.scheduleData).length > 0;
            if (full === 'true') {
                return { ...p, isConfigured };
            }
            const { scheduleData: _, ...programWithoutData } = p;
            return {
                ...programWithoutData,
                isConfigured
            };
        });
        res.json(optimizedPrograms);
    } catch (error) {
        console.error('Failed to fetch audit programs:', error);
        res.status(500).json({ error: 'Failed to fetch audit programs' });
    }
});

// Get single Audit Program (Full Details)
app.get('/audit-programs/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    try {
        const program = await prisma.auditProgram.findUnique({
            where: { id: Number.parseInt(id) },
            include: {
                site: { include: { company: true } },
                auditors: true,
                leadAuditor: true
            }
        });
        if (!program) return res.status(404).json({ error: 'Audit program not found' });
        if (!(await actorCanAccessAuditProgram(req.user.id, program))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        res.json(program);
    } catch (error) {
        console.error('Failed to fetch audit program details:', error);
        res.status(500).json({ error: 'Failed to fetch audit program details' });
    }
});

app.post('/audit-programs', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { name, isoStandard, frequency, duration, siteId, auditorIds, leadAuditorId, scheduleData, userId } = req.body;
    try {
        const actorId = req.user.id;
        if (await rejectIfAuditee(actorId, res, 'Auditees cannot create audit programs')) {
            return;
        }
        const ownerId = userId != null ? Number.parseInt(String(userId), 10) : actorId;
        if (Number.isNaN(ownerId)) {
            return res.status(400).json({ error: 'Invalid userId' });
        }
        if (!(await actorCanAccessTargetUser(actorId, ownerId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const programCount = await countOrgAuditPrograms(actorId);
        const trialRejected = await rejectIfTrialLimitExceeded(
            actorId,
            'auditProgram',
            programCount + 1,
        );
        if (trialRejected) {
            return res.status(403).json(trialRejected);
        }

        const program = await prisma.auditProgram.create({
            data: {
                name,
                isoStandard,
                frequency,
                duration: Number.parseInt(duration),
                siteId: Number.parseInt(siteId),
                auditors: {
                    connect: auditorIds.map(id => ({ id: Number.parseInt(id) }))
                },
                leadAuditorId: leadAuditorId ? Number.parseInt(leadAuditorId) : null,
                scheduleData: scheduleData || {},
                status: 'Draft',
                userId: ownerId
            },
            include: {
                site: true,
                auditors: true,
                leadAuditor: true
            }
        });
        res.status(201).json(program);
    } catch (error) {
        console.error('Error creating audit program:', error);
        res.status(500).json({ error: 'Failed to create audit program' });
    }
});

app.put('/audit-programs/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const { name, isoStandard, frequency, duration, siteId, auditorIds, leadAuditorId, scheduleData, status } = req.body;
    try {
        const existing = await prisma.auditProgram.findUnique({
            where: { id: Number.parseInt(id) },
            include: { auditors: true, leadAuditor: true }
        });
        if (!existing) return res.status(404).json({ error: 'Audit program not found' });
        if (!(await actorCanAccessAuditProgram(req.user.id, existing))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Disconnect all current auditors first before connecting new ones to ensure clean update
        await prisma.auditProgram.update({
            where: { id: Number.parseInt(id) },
            data: {
                auditors: {
                    set: []
                }
            }
        });

        const program = await prisma.auditProgram.update({
            where: { id: Number.parseInt(id) },
            data: {
                name,
                isoStandard,
                frequency,
                duration: Number.parseInt(duration),
                siteId: Number.parseInt(siteId),
                auditors: {
                    connect: auditorIds.map(aid => ({ id: Number.parseInt(aid) }))
                },
                leadAuditorId: leadAuditorId ? Number.parseInt(leadAuditorId) : null,
                scheduleData: scheduleData || {},
                status: status || 'Draft'
            },
            include: {
                site: true,
                auditors: true,
                leadAuditor: true
            }
        });
        res.json(program);
    } catch (error) {
        console.error('Error updating audit program:', error);
        res.status(500).json({ error: 'Failed to update audit program' });
    }
});

app.delete('/audit-programs/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const programId = Number.parseInt(id);
    try {
        const existing = await prisma.auditProgram.findUnique({
            where: { id: programId },
            include: { auditors: true, leadAuditor: true }
        });
        if (!existing) return res.status(404).json({ error: 'Audit program not found' });
        if (!(await actorCanAccessAuditProgram(req.user.id, existing))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.$transaction(async (tx) => {
            // Delete all associated audit plans first
            await tx.auditPlan.deleteMany({
                where: { auditProgramId: programId }
            });

            // Then delete the program
            await tx.auditProgram.delete({
                where: { id: programId }
            });
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting audit program:', error);
        res.status(500).json({ error: 'Failed to delete audit program' });
    }
});

// Audit Plan Routes

// Get all audit plans (optionally filter by programId)
app.get('/audit-plans', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { programId, userId } = req.query;
    try {
        const whereClause = {};
        if (programId) whereClause.auditProgramId = Number.parseInt(programId);

        const superAll = req.user.role === 'superadmin' && String(req.query.scope || '') === 'all';

        if (!superAll) {
            const actorId = req.user.id;

            if (await actorIsAuditee(actorId)) {
                const siteIds = await getAuditeeAssignedSiteIds(actorId);
                whereClause.auditProgram = {
                    is: siteIds.length > 0 ? { siteId: { in: siteIds } } : { siteId: -1 },
                };
            } else {
            const useOrgScope =
                String(req.query.scope || '') === 'org' ||
                !userId ||
                userId === 'undefined' ||
                userId === 'null';

            if (useOrgScope) {
                const orgRootId = await resolveActorOrgRootId(actorId);
                if (!(await actorCanReadOrgAssessmentStore(actorId, orgRootId))) {
                    return res.status(403).json({ error: 'Forbidden' });
                }
                const subtreeIds = await collectOrgSubtreeUserIds(orgRootId);
                whereClause.OR = buildOrgSubtreePlanVisibilityOr(subtreeIds);
            } else {
                let scopeUserId = Number.parseInt(String(userId), 10);
                if (Number.isNaN(scopeUserId)) {
                    return res.status(400).json({ error: 'Invalid userId' });
                }
                if (!(await actorCanAccessTargetUser(actorId, scopeUserId))) {
                    return res.status(403).json({ error: 'Forbidden' });
                }

                const uId = scopeUserId;
                const user = await prisma.user.findUnique({ where: { id: uId } });
                const effectiveAdminId = user?.creatorId || uId;

                whereClause.OR = [
                    { userId: uId },
                    { leadAuditorId: uId },
                    { auditors: { some: { id: uId } } },
                    { user: { is: { creatorId: uId } } },
                    { user: { is: { id: effectiveAdminId } } },
                    { user: { is: { creatorId: effectiveAdminId } } },
                    { auditProgram: { is: { userId: uId } } },
                    { auditProgram: { is: { leadAuditorId: uId } } },
                    { auditProgram: { is: { auditors: { some: { id: uId } } } } }
                ];
            }
            }
        }

        const plans = await prisma.auditPlan.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                executionId: true,
                auditType: true,
                auditName: true,
                date: true,
                location: true,
                createdAt: true,
                updatedAt: true,
                templateId: true,
                auditProgramId: true,
                userId: true,
                leadAuditorId: true,
                // We fetch auditData only to calculate progress on server
                auditData: true,
                findingsData: true,
                leadAuditor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                auditors: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                auditProgram: {
                    select: {
                        id: true,
                        name: true,
                        site: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Calculate progress on backend to reduce logic on frontend and keep it consistent
        const optimizedPlans = plans.map(plan => {
            let progress = 0;
            let auditCompleted = false;
            if (plan.auditData) {
                const data = typeof plan.auditData === 'string' ? JSON.parse(plan.auditData) : plan.auditData;
                progress = data.progress ?? 0;
                auditCompleted = data.auditCompleted === true;
            }

            const includeData = req.query.includeData === 'true';

            // Remove full auditData from the list response UNLESS includeData=true is passed
            if (!includeData) {
                const { auditData: _, ...planWithoutData } = plan;
                return {
                    ...planWithoutData,
                    progress,
                    auditCompleted,
                };
            }

            return {
                ...plan,
                progress,
                auditCompleted,
            };
        });

        res.json(optimizedPlans);
    } catch (error) {
        console.error('Failed to fetch audit plans:', error);
        res.status(500).json({ error: 'Failed to fetch audit plans' });
    }
});

// Get single Audit Plan (Full Details)
app.get('/audit-plans/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    try {
        const plan = await prisma.auditPlan.findUnique({
            where: { id: Number.parseInt(id) },
            include: {
                leadAuditor: true,
                auditors: true,
                auditProgram: {
                    include: {
                        site: true,
                        auditors: true,
                        leadAuditor: true
                    }
                }
            }
        });
        if (!plan) return res.status(404).json({ error: 'Audit plan not found' });
        if (!(await actorCanAccessAuditPlan(req.user.id, plan))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        res.json(plan);
    } catch (error) {
        console.error('Failed to fetch audit plan details:', error);
        res.status(500).json({ error: 'Failed to fetch audit plan details' });
    }
});

// Create Audit Plan
app.post('/audit-plans', authenticateToken, checkTrialExpiration, async (req, res) => {
    const {
        auditProgramId, executionId, auditType, auditName, templateId, date, location,
        scope, objective, criteria,
        leadAuditorId, auditorIds, itinerary, userId
    } = req.body;

    if (!auditProgramId) {
        import('fs').then(fs => fs.appendFileSync('audit_debug.log', JSON.stringify({ error: "Missing auditProgramId", body: req.body }) + '\n'));
        return res.status(400).json({ error: 'Missing required field: auditProgramId' });
    }

    try {
        const program = await prisma.auditProgram.findUnique({
            where: { id: Number.parseInt(auditProgramId, 10) },
            include: { auditors: true, leadAuditor: true }
        });
        if (!program) return res.status(404).json({ error: 'Audit program not found' });
        if (!(await actorCanAccessAuditProgram(req.user.id, program))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const actorId = req.user.id;
        const planOwnerId = userId != null ? Number.parseInt(String(userId), 10) : actorId;
        if (Number.isNaN(planOwnerId) || !(await actorCanAccessTargetUser(actorId, planOwnerId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const plan = await prisma.auditPlan.create({
            data: {
                auditProgramId: Number.parseInt(auditProgramId, 10),
                executionId,
                auditType,
                auditName,
                templateId,
                date: date ? new Date(date) : null,
                location,
                scope,
                objective,
                criteria,
                leadAuditorId: leadAuditorId ? Number.parseInt(leadAuditorId) : null,
                auditors: {
                    connect: auditorIds ? auditorIds.map(id => ({ id: Number.parseInt(id) })) : []
                },
                itinerary: itinerary || [],
                userId: planOwnerId
            }
        });
        res.status(201).json(plan);
    } catch (error) {
        console.error('Error saving audit plan:', error);
        import('fs').then(fs => fs.appendFileSync('audit_debug.log', JSON.stringify({ error: error.message, stack: error.stack, body: req.body }) + '\n'));
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'An audit plan for this program and execution already exists.' });
        }
        res.status(500).json({ error: 'Failed to save audit plan', details: error.message });
    }
});

// Update Audit Plan
app.put('/audit-plans/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const {
        auditType, auditName, templateId, date, location,
        scope, objective, criteria,
        leadAuditorId, auditorIds, itinerary
    } = req.body;

    try {
        const existing = await prisma.auditPlan.findUnique({
            where: { id: Number.parseInt(id) },
            include: {
                auditors: true,
                auditProgram: { include: { auditors: true, leadAuditor: true } }
            }
        });
        if (!existing) return res.status(404).json({ error: 'Audit plan not found' });
        if (!(await actorCanAccessAuditPlan(req.user.id, existing))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (await actorIsAuditee(Number(req.user.id))) {
            return res.status(403).json({
                error: 'Auditees can view and download audits only',
            });
        }

        const updateData = {};
        if (auditType !== undefined) updateData.auditType = auditType;
        if (auditName !== undefined) updateData.auditName = auditName;
        if (templateId !== undefined) updateData.templateId = templateId;
        if (date !== undefined) updateData.date = date ? new Date(date) : null;
        if (location !== undefined) updateData.location = location;
        if (scope !== undefined) updateData.scope = scope;
        if (objective !== undefined) updateData.objective = objective;
        if (criteria !== undefined) updateData.criteria = criteria;
        if (leadAuditorId !== undefined) updateData.leadAuditorId = leadAuditorId ? Number.parseInt(leadAuditorId) : null;
        if (auditorIds !== undefined) {
            updateData.auditors = {
                set: [],
                connect: auditorIds.map(aid => ({ id: Number.parseInt(aid) }))
            };
        }
        if (itinerary !== undefined) updateData.itinerary = itinerary;
        if (req.body.auditData !== undefined) {
            updateData.auditData = sanitizeAuditDataPayload(req.body.auditData);
        }
        if (req.body.findingsData !== undefined) updateData.findingsData = req.body.findingsData;
        updateData.updatedAt = new Date();

        const plan = await prisma.auditPlan.update({
            where: { id: Number.parseInt(id) },
            data: updateData
        });
        res.status(200).json(plan);
    } catch (error) {
        console.error('Error updating audit plan:', error);
        res.status(500).json({ error: 'Failed to update audit plan' });
    }
});

app.get('/assigned-audit-findings', authenticateToken, checkTrialExpiration, async (req, res) => {
    const actorId = Number(req.user?.id);
    try {
        const actor = await prisma.user.findUnique({
            where: { id: actorId },
            select: { email: true },
        });
        if (!actor?.email) {
            return res.json([]);
        }

        const actorEmail = actor.email.toLowerCase().trim();
        const isAuditee = await actorIsAuditee(actorId);
        const auditeeSiteIds = isAuditee ? await getAuditeeAssignedSiteIds(actorId) : null;

        const plans = await prisma.auditPlan.findMany({
            where: { auditData: { not: null } },
            select: ASSIGNED_FINDINGS_PLAN_SELECT,
            orderBy: { updatedAt: 'desc' },
        });

        const assignedPlans = plans.filter((plan) => {
            if (!collectAssigneeEmailsFromAuditData(plan.auditData).has(actorEmail)) {
                return false;
            }
            if (isAuditee && auditeeSiteIds) {
                const siteId = plan.auditProgram?.siteId;
                return siteId != null && auditeeSiteIds.includes(Number(siteId));
            }
            return true;
        });

        res.json(assignedPlans);
    } catch (error) {
        console.error('Failed to fetch assigned audit findings:', error);
        res.status(500).json({ error: 'Failed to fetch assigned findings' });
    }
});

app.post('/audit-plans/:id/notify-finding-assignment', authenticateToken, checkTrialExpiration, async (req, res) => {
    const planId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(planId)) {
        return res.status(400).json({ error: 'Invalid audit plan id' });
    }

    const { assignToEmail, assignToName, findingRef, findingType, assignment } = req.body || {};
    const actorId = Number(req.user?.id);

    try {
        const existing = await prisma.auditPlan.findUnique({
            where: { id: planId },
            include: {
                auditors: true,
                auditProgram: { include: { auditors: true, leadAuditor: true } },
            },
        });
        if (!existing) return res.status(404).json({ error: 'Audit plan not found' });
        if (!(await actorCanAccessAuditPlan(actorId, existing))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const lookup = await findUserByEmail(assignToEmail);
        if (lookup.error) {
            return res.status(lookup.status || 400).json({ error: lookup.error });
        }
        if (!lookup.found) {
            return res.status(404).json({ error: 'User does not exist. Please create the user.' });
        }

        const resolvedName = assignToName || lookup.name;
        let persistedAuditData = existing.auditData;
        if (assignment?.source && assignment?.key != null) {
            persistedAuditData = applyFindingAssignmentToAuditData(
                existing.auditData,
                assignment,
                lookup.email,
                resolvedName,
            );
            await prisma.auditPlan.update({
                where: { id: planId },
                data: {
                    auditData: sanitizeAuditDataPayload(persistedAuditData),
                    updatedAt: new Date(),
                },
            });
        }

        const assigner = await prisma.user.findUnique({
            where: { id: actorId },
            select: { firstName: true, lastName: true, email: true },
        });
        const assignerName =
            `${assigner?.firstName || ''} ${assigner?.lastName || ''}`.trim() ||
            assigner?.email ||
            'A team member';

        const result = await sendFindingAssignmentEmail({
            assignToEmail: lookup.email,
            assignToName: resolvedName,
            assignerName,
            auditName: existing.auditName,
            findingRef,
            findingType,
            auditPlanId: planId,
        });

        return res.json({
            ok: true,
            notified: result.sent === true,
            persisted: Boolean(assignment?.source && assignment?.key != null),
            assignee: { id: lookup.id, name: lookup.name, email: lookup.email },
        });
    } catch (error) {
        console.error('Failed to notify finding assignment:', error);
        return res.status(500).json({ error: 'Failed to send assignment notification' });
    }
});

// --- Organization-scoped gap analysis & self assessment (not blocked by trial expiry) ---

app.get('/gap-analyses', authenticateToken, async (req, res) => {
    try {
        const actorId = Number(req.user.id);
        if (await actorIsAuditee(actorId)) {
            return res.json({
                userId: actorId,
                orgRootUserId: actorId,
                analyses: [],
                draft: null,
                updatedAt: null,
                canWrite: false,
            });
        }
        const { userId, analyses, draft, row } = await ensureUserGapAnalysisStore(actorId);
        res.json({
            userId,
            orgRootUserId: userId,
            analyses,
            draft,
            updatedAt: row.updatedAt,
            canWrite: await actorCanWriteOrgAssessmentStore(actorId),
        });
    } catch (error) {
        console.error('Error loading gap analyses:', error);
        res.status(500).json({ error: 'Failed to load gap analyses' });
    }
});

app.put('/gap-analyses', authenticateToken, async (req, res) => {
    try {
        const actorId = Number(req.user.id);
        if (!(await actorCanWriteOrgAssessmentStore(actorId))) {
            return res.status(403).json({ error: 'Forbidden', message: 'Read-only role cannot modify gap analyses.' });
        }
        await ensureUserGapAnalysisStore(actorId);
        const { analyses, draft } = req.body ?? {};
        const existing = await prisma.userGapAnalysisStore.findUnique({
            where: { userId: actorId },
        });
        const ownedExisting = filterGapAnalysesForUser(existing?.analyses, actorId);
        const data = {
            analyses:
                analyses !== undefined
                    ? stampGapAnalysesForUser(filterGapAnalysesForUser(analyses, actorId), actorId)
                    : ownedExisting,
            draft:
                draft !== undefined
                    ? draft === null
                        ? null
                        : gapAnalysisDraftForUser({ ...draft, ownerUserId: actorId }, actorId)
                    : (existing?.draft ?? null),
        };
        if (analyses !== undefined) {
            const orgTotalBefore = await countOrgGapAnalyses(actorId);
            const actorDelta = data.analyses.length - ownedExisting.length;
            const trialRejected = await rejectIfTrialLimitExceeded(
                actorId,
                'gapAnalysis',
                orgTotalBefore + actorDelta,
            );
            if (trialRejected) {
                return res.status(403).json(trialRejected);
            }
        }
        const row = await prisma.userGapAnalysisStore.upsert({
            where: { userId: actorId },
            create: { userId: actorId, ...data },
            update: data,
        });
        res.json({ ok: true, userId: actorId, orgRootUserId: actorId, updatedAt: row.updatedAt });
    } catch (error) {
        console.error('Error saving gap analyses:', error);
        res.status(500).json({ error: 'Failed to save gap analyses' });
    }
});

app.delete('/gap-analyses/:externalId', authenticateToken, async (req, res) => {
    try {
        const actorId = Number(req.user.id);
        if (!(await actorCanWriteOrgAssessmentStore(actorId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { analyses } = await ensureUserGapAnalysisStore(actorId);
        const externalId = String(req.params.externalId || '');
        const next = analyses.filter((a) => String(a?.id) !== externalId);
        if (next.length === analyses.length) {
            return res.status(404).json({ error: 'Gap analysis not found' });
        }
        await prisma.userGapAnalysisStore.update({
            where: { userId: actorId },
            data: { analyses: stampGapAnalysesForUser(next, actorId) },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting gap analysis:', error);
        res.status(500).json({ error: 'Failed to delete gap analysis' });
    }
});

app.get('/self-assessments', authenticateToken, async (req, res) => {
    try {
        const actorId = Number(req.user.id);
        if (await actorIsAuditee(actorId)) {
            return res.json({
                userId: actorId,
                orgRootUserId: actorId,
                assessments: [],
                draft: null,
                updatedAt: null,
                canWrite: false,
            });
        }
        const { userId, assessments, draft, row } = await ensureUserSelfAssessmentStore(actorId);
        res.json({
            userId,
            orgRootUserId: userId,
            assessments,
            draft,
            updatedAt: row.updatedAt,
            canWrite: actorCanWriteSelfAssessmentStore(actorId),
        });
    } catch (error) {
        console.error('Error loading self assessments:', error);
        res.status(500).json({ error: 'Failed to load self assessments' });
    }
});

app.put('/self-assessments', authenticateToken, async (req, res) => {
    try {
        const actorId = Number(req.user.id);
        if (!actorCanWriteSelfAssessmentStore(actorId)) {
            return res.status(403).json({ error: 'Forbidden', message: 'Cannot modify self assessments.' });
        }
        await ensureUserSelfAssessmentStore(actorId);
        const { assessments, draft } = req.body ?? {};
        const existing = await prisma.userSelfAssessmentStore.findUnique({
            where: { userId: actorId },
        });
        const ownedExisting = filterSelfAssessmentsForUser(existing?.assessments, actorId);
        const data = {
            assessments:
                assessments !== undefined
                    ? stampSelfAssessmentsForUser(
                          filterSelfAssessmentsForUser(assessments, actorId),
                          actorId,
                      )
                    : ownedExisting,
            draft:
                draft !== undefined
                    ? draft === null
                        ? null
                        : selfAssessmentDraftForUser({ ...draft, ownerUserId: actorId }, actorId)
                    : (existing?.draft ?? null),
        };
        if (assessments !== undefined) {
            const orgTotalBefore = await countOrgSelfAssessments(actorId);
            const actorDelta = data.assessments.length - ownedExisting.length;
            const trialRejected = await rejectIfTrialLimitExceeded(
                actorId,
                'selfAssessment',
                orgTotalBefore + actorDelta,
            );
            if (trialRejected) {
                return res.status(403).json(trialRejected);
            }
        }
        const row = await prisma.userSelfAssessmentStore.upsert({
            where: { userId: actorId },
            create: { userId: actorId, ...data },
            update: data,
        });
        res.json({ ok: true, userId: actorId, orgRootUserId: actorId, updatedAt: row.updatedAt });
    } catch (error) {
        console.error('Error saving self assessments:', error);
        res.status(500).json({ error: 'Failed to save self assessments' });
    }
});

app.delete('/self-assessments/:externalId', authenticateToken, async (req, res) => {
    try {
        const actorId = Number(req.user.id);
        if (!actorCanWriteSelfAssessmentStore(actorId)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { assessments } = await ensureUserSelfAssessmentStore(actorId);
        const externalId = String(req.params.externalId || '');
        const next = assessments.filter((a) => String(a?.id) !== externalId);
        if (next.length === assessments.length) {
            return res.status(404).json({ error: 'Self assessment not found' });
        }
        await prisma.userSelfAssessmentStore.update({
            where: { userId: actorId },
            data: { assessments: stampSelfAssessmentsForUser(next, actorId) },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting self assessment:', error);
        res.status(500).json({ error: 'Failed to delete self assessment' });
    }
});

/** @deprecated Use /gap-analyses — kept for older clients */
app.get('/user-persisted/gap-analyses', authenticateToken, async (req, res) => {
    try {
        const actorId = Number(req.user.id);
        const { analyses, draft } = await ensureUserGapAnalysisStore(actorId);
        res.json({ analyses, draft });
    } catch (error) {
        console.error('Error loading gap analyses:', error);
        res.status(500).json({ error: 'Failed to load gap analyses' });
    }
});
app.put('/user-persisted/gap-analyses', authenticateToken, async (req, res) => {
    try {
        const actorId = Number(req.user.id);
        if (!(await actorCanWriteOrgAssessmentStore(actorId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await ensureUserGapAnalysisStore(actorId);
        const { analyses, draft } = req.body ?? {};
        const existing = await prisma.userGapAnalysisStore.findUnique({
            where: { userId: actorId },
        });
        const data = {
            analyses:
                analyses !== undefined
                    ? stampGapAnalysesForUser(analyses, actorId)
                    : filterGapAnalysesForUser(existing?.analyses, actorId),
            draft:
                draft !== undefined
                    ? draft === null
                        ? null
                        : gapAnalysisDraftForUser({ ...draft, ownerUserId: actorId }, actorId)
                    : (existing?.draft ?? null),
        };
        const row = await prisma.userGapAnalysisStore.upsert({
            where: { userId: actorId },
            create: { userId: actorId, ...data },
            update: data,
        });
        res.json({ ok: true, updatedAt: row.updatedAt });
    } catch (error) {
        console.error('Error saving gap analyses:', error);
        res.status(500).json({ error: 'Failed to save gap analyses' });
    }
});
app.get('/user-persisted/self-assessments', authenticateToken, async (req, res) => {
    try {
        const actorId = Number(req.user.id);
        const { assessments, draft } = await ensureUserSelfAssessmentStore(actorId);
        res.json({ assessments, draft });
    } catch (error) {
        console.error('Error loading self assessments:', error);
        res.status(500).json({ error: 'Failed to load self assessments' });
    }
});
app.put('/user-persisted/self-assessments', authenticateToken, async (req, res) => {
    try {
        const actorId = Number(req.user.id);
        if (!actorCanWriteSelfAssessmentStore(actorId)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await ensureUserSelfAssessmentStore(actorId);
        const { assessments, draft } = req.body ?? {};
        const existing = await prisma.userSelfAssessmentStore.findUnique({
            where: { userId: actorId },
        });
        const ownedExisting = filterSelfAssessmentsForUser(existing?.assessments, actorId);
        const data = {
            assessments:
                assessments !== undefined
                    ? stampSelfAssessmentsForUser(
                          filterSelfAssessmentsForUser(assessments, actorId),
                          actorId,
                      )
                    : ownedExisting,
            draft:
                draft !== undefined
                    ? draft === null
                        ? null
                        : selfAssessmentDraftForUser({ ...draft, ownerUserId: actorId }, actorId)
                    : (existing?.draft ?? null),
        };
        const row = await prisma.userSelfAssessmentStore.upsert({
            where: { userId: actorId },
            create: { userId: actorId, ...data },
            update: data,
        });
        res.json({ ok: true, updatedAt: row.updatedAt });
    } catch (error) {
        console.error('Error saving self assessments:', error);
        res.status(500).json({ error: 'Failed to save self assessments' });
    }
});

// Delete Audit Plan
app.delete('/audit-plans/:id', authenticateToken, checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.auditPlan.findUnique({
            where: { id: Number.parseInt(id) },
            include: {
                auditors: true,
                auditProgram: { include: { auditors: true, leadAuditor: true } }
            }
        });
        if (!existing) return res.status(404).json({ error: 'Audit plan not found' });
        if (!(await actorCanAccessAuditPlan(req.user.id, existing))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.auditPlan.delete({
            where: { id: Number.parseInt(id) }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting audit plan:', error);
        res.status(500).json({ error: 'Failed to delete audit plan' });
    }
});


// Send Self Assessment Report by email
app.post('/send-assessment-report', authenticateToken, async (req, res) => {
    const raw = req.body || {};
    const to = sanitizePlainText(raw.to, 254)?.toLowerCase().replace(/[^\w.@+-]/g, '') || '';
    const companyName = sanitizePersonName(raw.companyName, 200) || '';
    const auditorName = sanitizePersonName(raw.auditorName, 200) || '';
    const auditCompany = raw.auditCompany ? sanitizePersonName(raw.auditCompany, 200) : '';
    const standard = sanitizeShortLabel(raw.standard, 80) || '';
    const score = Number(raw.score);
    const date = raw.date;
    const questions = Array.isArray(raw.questions) ? raw.questions : [];

    if (!to || !companyName || !standard) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    const uid = req.user.id;
    const last = assessmentReportEmailLastSent.get(uid) || 0;
    if (Date.now() - last < OTP_RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - last)) / 1000);
        res.setHeader('Retry-After', String(remainingSeconds));
        return res.status(429).json({
            error: `Please wait ${remainingSeconds} seconds before sending another report email.`,
            retryAfterSeconds: remainingSeconds
        });
    }
    assessmentReportEmailLastSent.set(uid, Date.now());

    try {
        const total = questions?.length || 0;
        const yesCount = questions?.filter(q => q.answer === 'yes').length || 0;
        const noCount = questions?.filter(q => q.answer === 'no').length || 0;
        const percentage = total > 0 ? Math.round((yesCount / total) * 100) : 0;

        // Group questions by clause for detailed breakdown
        const clauseGroups = {};
        (questions || []).forEach(q => {
            const clauseKey = sanitizePlainText(q.clause, 200) || 'General';
            if (!clauseGroups[clauseKey]) clauseGroups[clauseKey] = { yes: 0, no: 0, total: 0 };
            clauseGroups[clauseKey].total++;
            if (q.answer === 'yes') clauseGroups[clauseKey].yes++;
            else clauseGroups[clauseKey].no++;
        });

        const clauseRows = Object.entries(clauseGroups).map(([clause, data]) => {
            const pct = Math.round((data.yes / data.total) * 100);
            const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626';
            const safeClause = escapeHtml(sanitizePlainText(clause, 200) || '');
            return `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${safeClause}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px;">${data.yes} / ${data.total}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">
                    <span style="color:${color};font-weight:600;font-size:13px;">${pct}%</span>
                </td>
            </tr>`;
        }).join('');

        const scoreColor = percentage >= 70 ? '#16a34a' : percentage >= 40 ? '#d97706' : '#dc2626';
        const stage = score >= 38 ? 'Mature Stage' : score >= 25 ? 'Moderate Stage' : 'Early Stage';

        if (!isSmtpConfigured()) {
            console.error('[assessment-report] SMTP_USER and SMTP_PASS must both be set to send report emails.');
            return res.status(503).json({ error: 'Email service is not configured. Please contact your administrator.' });
        }

        const mailOptions = {
            from: { name: 'iAudit Global', address: getSmtpFromAddress() },
            to,
            subject: `Your ${escapeHtml(standard)} Self Assessment Report — ${escapeHtml(companyName)}`,
            html: `
            <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#f8fafc;">
                <!-- Header -->
                <div style="background:#213847;padding:28px 32px;border-radius:8px 8px 0 0;">
                    <h1 style="margin:0;color:#fff;font-size:22px;">Self Assessment Report</h1>
                    <p style="margin:6px 0 0;color:#94a3b8;font-size:14px;">${escapeHtml(standard)}</p>
                </div>

                <!-- Details -->
                <div style="background:#fff;padding:28px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:160px;">Company</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${escapeHtml(companyName)}</td></tr>
                        ${auditCompany ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Company Being Audited</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${escapeHtml(auditCompany)}</td></tr>` : ''}
                        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Auditor</td><td style="padding:6px 0;font-size:13px;">${escapeHtml(auditorName || '-')}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Date</td><td style="padding:6px 0;font-size:13px;">${date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td></tr>
                    </table>

                    <!-- Score Banner -->
                    <div style="background:#f1f5f9;border-radius:8px;padding:20px 24px;text-align:center;margin-bottom:24px;">
                        <p style="margin:0 0 4px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Overall Score</p>
                        <span style="font-size:42px;font-weight:700;color:${scoreColor};">${score} <span style="font-size:22px;color:#94a3b8;">/ 50</span></span>
                        <p style="margin:8px 0 0;color:#475569;font-size:14px;">Maturity Stage: <strong>${stage}</strong></p>
                        <p style="margin:4px 0 0;color:#475569;font-size:13px;">${yesCount} Yes &nbsp;·&nbsp; ${noCount} No &nbsp;·&nbsp; ${total} Total Questions</p>
                    </div>

                    <!-- Clause Breakdown -->
                    <h3 style="margin:0 0 12px;font-size:15px;color:#1e293b;">Score by Clause</h3>
                    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
                        <thead>
                            <tr style="background:#213847;">
                                <th style="padding:10px 12px;text-align:left;color:#fff;font-size:13px;">Clause</th>
                                <th style="padding:10px 12px;text-align:center;color:#fff;font-size:13px;">Compliance</th>
                                <th style="padding:10px 12px;text-align:center;color:#fff;font-size:13px;">Score</th>
                            </tr>
                        </thead>
                        <tbody>${clauseRows}</tbody>
                    </table>
                </div>

                <!-- Footer -->
                <div style="background:#f1f5f9;padding:16px 32px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;text-align:center;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;">This report was generated by AuditMate. For questions, contact your administrator.</p>
                </div>
            </div>`
        };

        // Attach PDF if provided
        if (req.body.pdfBase64) {
            mailOptions.attachments = [{
                filename: `Self_Assessment_${companyName.replace(/\s+/g, '_')}_Report.pdf`,
                content: Buffer.from(req.body.pdfBase64, 'base64'),
                contentType: 'application/pdf'
            }];
        }

        // Fire-and-forget: report is already saved client-side; do not block on SMTP latency.
        transporter.sendMail(mailOptions)
            .then(() => console.log(`Assessment report sent to ${to}`))
            .catch((err) => console.error('Failed to send assessment report email:', err));

        res.json({ success: true });
    } catch (error) {
        console.error('Error sending assessment report:', error);
        res.status(500).json({ error: 'Failed to send report' });
    }
});

// Feedback API
app.post('/feedback', async (req, res) => {
    const { name, email, feedback, image } = req.body;

    if (!name || !email || !feedback) {
        return res.status(400).json({ error: 'Name, email, and feedback are required' });
    }

    try {
        // SECURITY: treat input as plain text only.
        // - Strip markup from `name` / `feedback`
        // - Escape before interpolating into HTML email templates
        const safeName = sanitizePersonName(name);
        if (!safeName) return res.status(400).json({ error: 'Invalid name' });

        const safeEmail = typeof email === 'string' ? email.trim() : '';
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(safeEmail);
        if (!emailOk) return res.status(400).json({ error: 'Invalid email' });

        const safeFeedback = sanitizePlainText(feedback, 5_000, { preserveNewlines: true });
        if (!safeFeedback) return res.status(400).json({ error: 'Invalid feedback' });

        const feedbackHtml = escapeHtml(safeFeedback).replace(/\n/g, '<br/>');
        const safeImage = typeof image === 'string' ? image.trim() : '';
        const allowedFeedbackMimeToExt = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'application/pdf': 'pdf'
        };
        let attachmentPayload = null;
        if (safeImage) {
            const match = safeImage.match(/^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
            if (!match) return res.status(400).json({ error: 'Invalid attachment format' });
            const mime = match[1].toLowerCase();
            const extension = allowedFeedbackMimeToExt[mime];
            if (!extension) return res.status(400).json({ error: 'Only PNG, JPG, and PDF files are allowed' });
            attachmentPayload = { base64Data: match[2], extension, mime };
        }

        const mailOptions = {
            from: process.env.SMTP_USER || 'noreply@iaudit.global',
            to: 'Mathew@iaudit.global',
            cc: ['jasmin@iaudit.global', 'ybro44240@gmail.com'],
            subject: `[Feedback] From ${safeName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background: #213847; padding: 20px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0;">New User Feedback</h2>
                    </div>
                    <div style="padding: 24px;">
                        <p style="margin-bottom: 20px; font-size: 16px; color: #475569;">You have received a new feedback submission from a user.</p>
                        
                        <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
                            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase;">Name</p>
                            <p style="margin: 0 0 16px; font-weight: 600; color: #1e293b;">${escapeHtml(safeName)}</p>
                            
                            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase;">Email</p>
                            <p style="margin: 0 0 16px; font-weight: 600; color: #1e293b;">${escapeHtml(safeEmail)}</p>
                            
                            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase;">Feedback</p>
                            <p style="margin: 0; color: #334155; line-height: 1.6;">${feedbackHtml}</p>
                        </div>
                        
                        ${attachmentPayload ? '<p style="color: #64748b; font-size: 13px;"><em>An attachment is included below.</em></p>' : ''}
                    </div>
                    <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #94a3b8;">
                        This email was sent automatically from iAudit Global Feedback system.
                    </div>
                </div>
            `
        };

        if (attachmentPayload) {
            mailOptions.attachments = [{
                filename: `feedback_attachment.${attachmentPayload.extension}`,
                content: attachmentPayload.base64Data,
                encoding: 'base64',
                contentType: attachmentPayload.mime
            }];
        }

        await transporter.sendMail(mailOptions);
        console.log(`Feedback email sent from ${email}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending feedback email:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

app.get('/stripe/session/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'payment_intent']
        });

        const planId = session.metadata?.planId || 'Standard';
        const billingType = session.metadata?.billingType || 'One-time';
        const amount = (session.amount_total / 100).toFixed(2);
        const currency = session.currency?.toUpperCase();
        
        let status = session.status;
        let currentPeriodEnd = null;
        let subscriptionId = session.subscription?.id || session.subscription || null;

        if (session.subscription && typeof session.subscription === 'object') {
            status = session.subscription.status;
            currentPeriodEnd = new Date(session.subscription.current_period_end * 1000).toISOString();
        }

        res.json({
            plan: planId.toUpperCase(),
            isMonthly: billingType.toUpperCase() === 'MONTHLY',
            subscriptionId,
            status,
            currentPeriodEnd,
            amount,
            currency,
            // SECURITY: Return metadata for frontend verification
            userId: session.metadata?.userId || null,
            email: session.metadata?.email || null
        });
    } catch (error) {
        console.error('Stripe Session Retrieve Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- Stripe Payment Routes ---

app.post('/payments/create-checkout-session', authenticateToken, async (req, res) => {
    const { userId, planId, billingType, currency, priceId: directPriceId, duration } = req.body;

    if (!userId || !planId || !billingType || !currency) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const requestedId = Number.parseInt(String(userId), 10);
        if (Number.isNaN(requestedId) || requestedId !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const user = await prisma.user.findUnique({ where: { id: requestedId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Duplicate subscription check: block if user already has active subscription
        if (user.subscriptionStatus === 'active') {
            return res.status(400).json({ error: 'You already have an active subscription. Manage it from Account Settings.' });
        }

        // Use direct priceId from frontend if provided, otherwise fall back to config lookup
        let priceId = directPriceId;
        if (!priceId) {
            const planKey = planId.toUpperCase();
            const billingKey = billingType.toUpperCase();
            const currencyKey = currency.toUpperCase();
            const durationKey = duration || '1year';
            priceId = STRIPE_CONFIG.PLANS[planKey]?.[billingKey]?.[durationKey]?.[currencyKey];
        }

        if (!priceId || priceId.includes('placeholder')) {
            return res.status(400).json({ error: 'Invalid plan or pricing configuration' });
        }

        // 1. Ensure Stripe Customer exists (with validation for test/live mode mismatch)
        let stripeCustomerId = user.stripeCustomerId;
        if (stripeCustomerId) {
            // Validate the existing customer ID works with the current Stripe key (test vs live)
            try {
                await stripe.customers.retrieve(stripeCustomerId);
            } catch (err) {
                console.warn(`[Stripe] Invalid customer ID ${stripeCustomerId} for user ${user.id} — recreating. Error: ${err.message}`);
                stripeCustomerId = null; // Force re-creation below
            }
        }
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                metadata: { userId: user.id.toString(), email: user.email }
            });
            stripeCustomerId = customer.id;
            await prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId }
            });
        }

        // 2. Create Checkout Session
        const billingKey = billingType.toUpperCase();
        const currencyKey = currency.toUpperCase();
        const isSubscription = billingKey === 'MONTHLY';

        const sessionParams = {
            customer: stripeCustomerId,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: isSubscription ? 'subscription' : 'payment',
            locale: 'auto',
            adaptive_pricing: { enabled: false }, 
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/subscription?canceled=true`,
            metadata: { 
                userId: user.id.toString(), 
                email: user.email,
                planId, 
                billingType, 
                duration: duration || '1year' 
            },
        };

        // For one-time payments, enable invoice creation
        if (!isSubscription) {
            sessionParams.invoice_creation = { enabled: true };
        }

        // For subscriptions, lock currency via the currency param
        if (isSubscription) {
            sessionParams.currency = currencyKey.toLowerCase();
            sessionParams.subscription_data = {
                metadata: { 
                    userId: user.id.toString(), 
                    email: user.email,
                    planId, 
                    billingType, 
                    duration: duration || '1year' 
                }
            };
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        // 3. Log pending payment
        await prisma.payment.create({
            data: {
                userId: user.id,
                amount: 0, // Will be updated by webhook
                currency: currencyKey,
                status: 'pending',
                stripeSessionId: session.id,
                billingType: billingType,
                duration: duration || null
            }
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe Session Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/payments/portal', authenticateToken, async (req, res) => {
    const { userId } = req.body;
    try {
        const requestedId = Number.parseInt(String(userId), 10);
        if (Number.isNaN(requestedId) || requestedId !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const user = await prisma.user.findUnique({ where: { id: requestedId } });
        if (!user || !user.stripeCustomerId) {
            return res.status(400).json({ error: 'Stripe customer not found' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/subscription`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Portal Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- Subscription Invoices Endpoint ---
app.get('/subscription/invoices/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    try {
        const targetId = Number.parseInt(String(userId), 10);
        if (Number.isNaN(targetId) || !(await actorCanViewUserBillingStatus(req.user.id, targetId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const user = await prisma.user.findUnique({ where: { id: targetId } });
        if (!user || !user.stripeCustomerId) {
            return res.json([]); // Return empty if no customer exists yet
        }

        // 1. Fetch current Stripe invoices with deep expansion for receipts
        const invoices = await stripe.invoices.list({
            customer: user.stripeCustomerId,
            limit: 20,
            expand: ['data.charge', 'data.payment_intent.latest_charge']
        });

        // 2. Fetch local payment records to fill gaps (especially for one-time payments without invoices)
        const localPayments = await prisma.payment.findMany({
            where: { userId: targetId, status: 'paid' },
            orderBy: { createdAt: 'desc' }
        });

        // Map Stripe invoices first
        const stripeInvoiceData = invoices.data.map(inv => {
            // Robust extraction: Check both expanded objects and potential path variations
            let receipt_url = null;
            
            if (inv.charge && typeof inv.charge === 'object') {
                receipt_url = inv.charge.receipt_url;
            } 
            
            if (!receipt_url && inv.payment_intent && typeof inv.payment_intent === 'object') {
                receipt_url = inv.payment_intent.latest_charge?.receipt_url || 
                              inv.payment_intent.charges?.data?.[0]?.receipt_url;
            }

            // Fallback for metadata/legacy if still not found but it's a Stripe invoice
            if (!receipt_url) {
                receipt_url = inv.hosted_invoice_url; // Last resort if specific receipt is missing
            }
            
            console.log(`[Stripe Invoice Debug] ID: ${inv.id} | Charge Obj: ${typeof inv.charge} | PI Obj: ${typeof inv.payment_intent} | Final Receipt: ${receipt_url ? 'FOUND' : 'MISSING'}`);

            return {
                id: inv.id,
                date: inv.status_transitions?.paid_at 
                    ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
                    : new Date(inv.created * 1000).toISOString(),
                amount: (inv.amount_paid / 100).toFixed(2),
                currency: inv.currency.toUpperCase(),
                status: inv.status === 'paid' ? 'PAID' : inv.status.toUpperCase(),
                invoice_pdf: inv.invoice_pdf || null,
                hosted_invoice_url: inv.hosted_invoice_url || null,
                receipt_url: receipt_url,
                number: inv.number,
                source: 'stripe'
            };
        });

        // Identify local payments that don't have a corresponding Stripe invoice in our list
        const missingPayments = localPayments.filter(payment => 
            !stripeInvoiceData.some(inv => inv.id === payment.stripeInvoiceId)
        );

        // Map local payments as fallback entries
        const fallbackPaymentData = await Promise.all(missingPayments.map(async (payment) => {
            let receiptUrl = null;
            if (payment.stripePaymentIntentId) {
                try {
                    const pi = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId, {
                        expand: ['latest_charge', 'charges.data']
                    });
                    receiptUrl = pi.latest_charge?.receipt_url || pi.charges?.data?.[0]?.receipt_url || null;
                } catch (e) {
                    console.error('Error fetching PI for receipt:', e.message);
                }
            }

            console.log(`[Local Payment Debug] ID: ${payment.id} | PI: ${payment.stripePaymentIntentId} | Final Receipt: ${receiptUrl ? 'FOUND' : 'MISSING'}`);

            return {
                id: payment.stripePaymentIntentId || `local_${payment.id}`,
                date: payment.createdAt.toISOString(),
                amount: payment.amount.toFixed(2),
                currency: payment.currency.toUpperCase(),
                status: 'PAID',
                invoice_pdf: null,
                hosted_invoice_url: null,
                receipt_url: receiptUrl,
                number: payment.billingType?.toUpperCase() === 'MONTHLY' ? 'Subscription' : 'One-time Payment',
                source: 'local'
            };
        }));

        // Combine and sort by date descending
        const combinedData = [...stripeInvoiceData, ...fallbackPaymentData].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        res.json(combinedData);
    } catch (error) {
        console.error('Invoices Fetch Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- Update Renewal Preference ---
app.patch('/users/:userId/subscription-preference', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    const { renewalType, autopayConsent, subscriptionId } = req.body;

    console.log(`[PREFERENCE] Received update request for user: ${userId}, preference: ${renewalType}, consent: ${autopayConsent}`);

    try {
        if (!renewalType) {
            return res.status(400).json({ error: 'Missing renewalType' });
        }

        const targetUserId = Number.parseInt(userId);
        if (Number.isNaN(targetUserId)) {
             return res.status(400).json({ error: 'Invalid User ID' });
        }

        if (!(await actorCanViewUserBillingStatus(req.user.id, targetUserId))) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const user = await prisma.user.update({
            where: { id: targetUserId },
            data: {
                renewalType: renewalType.toUpperCase(),
                autopayConsent: autopayConsent === true
            }
        });

        // Sync with Stripe if subscription exists
        if (subscriptionId) {
             try {
                const updateParams = {};
                if (renewalType === 'MANUAL') {
                    updateParams.collection_method = 'send_invoice';
                    updateParams.days_until_due = 15; 
                } else {
                    updateParams.collection_method = 'charge_automatically';
                }
                await stripe.subscriptions.update(subscriptionId, updateParams);
                console.log(`[PREFERENCE] Stripe subscription ${subscriptionId} synchronized`);
             } catch (stripeError) {
                console.error('[PREFERENCE] Stripe Sync Error:', stripeError.message);
                // We still returned success because DB is updated
             }
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error('Preference Update Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- Subscription Cancellation Request ---
app.post('/subscription/cancel-request', authenticateToken, async (req, res) => {
    const { userId, reason, description } = req.body;

    console.log('Cancellation Request Received:', { userId, reason });

    if (!userId || !reason) {
        return res.status(400).json({ error: 'User ID and Reason are required' });
    }

    const parsedId = Number.parseInt(userId);
    if (Number.isNaN(parsedId)) {
        console.error('Invalid User ID received:', userId);
        return res.status(400).json({ error: 'Invalid User ID format' });
    }

    try {
        const actor = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { role: true }
        });
        if (actor?.role !== 'superadmin' && parsedId !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const user = await prisma.user.findUnique({ where: { id: parsedId } });
        if (!user) {
            console.error('User not found for cancellation request:', parsedId);
            return res.status(404).json({ error: 'User not found' });
        }

        const mailOptions = {
            from: process.env.SMTP_USER || 'noreply@iaudit.global',
            to: 'support@iaudit.global',
            subject: `[Cancellation Request] ${user.firstName} ${user.lastName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <div style="background-color: #dc2626; padding: 32px 24px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">CANCELLATION REQUEST</h1>
                    </div>
                    <div style="padding: 32px 24px;">
                        <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.5;">A user has submitted a request to cancel their premium subscription.</p>
                        
                        <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                             <div style="margin-bottom: 16px;">
                                <p style="margin: 0 0 4px; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">User Identification</p>
                                <p style="margin: 0; font-weight: 700; color: #111827; font-size: 15px;">${user.firstName} ${user.lastName} (${user.email})</p>
                            </div>
                            <div style="margin-bottom: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 4px; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Plan Details</p>
                                <p style="margin: 0; font-weight: 700; color: #111827; font-size: 15px;">${user.subscriptionPlan ? user.subscriptionPlan.toUpperCase() : 'N/A'}</p>
                            </div>
                            <div style="margin-bottom: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 4px; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Primary Reason</p>
                                <p style="margin: 0; font-weight: 700; color: #dc2626; font-size: 15px;">${reason}</p>
                            </div>
                            <div style="padding-top: 16px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 8px; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Detailed Feedback</p>
                                <p style="margin: 0; color: #374151; line-height: 1.6; font-size: 14px;">${description || 'No additional comments provided.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Cancellation request successfully sent for ${user.email}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Cancellation Request Error:', error);
        res.status(500).json({ error: error.message || 'Server error while sending request' });
    }
});

// --- Subscription Upgrade Request ---
app.post('/subscription/upgrade-request', authenticateToken, async (req, res) => {
    const { userId, targetPlan, description } = req.body;

    console.log('Upgrade Request Received:', { userId, targetPlan });

    if (!userId || !targetPlan) {
        return res.status(400).json({ error: 'User ID and Target Plan are required' });
    }

    const parsedId = Number.parseInt(userId);
    if (Number.isNaN(parsedId)) {
        console.error('Invalid User ID received:', userId);
        return res.status(400).json({ error: 'Invalid User ID format' });
    }

    try {
        const actor = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { role: true }
        });
        if (actor?.role !== 'superadmin' && parsedId !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const user = await prisma.user.findUnique({ where: { id: parsedId } });
        if (!user) {
            console.error('User not found for upgrade request:', parsedId);
            return res.status(404).json({ error: 'User not found' });
        }

        const mailOptions = {
            from: process.env.SMTP_USER || 'noreply@iaudit.global',
            to: 'support@iaudit.global',
            subject: `[Upgrade Request] ${user.firstName} ${user.lastName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <div style="background-color: #1e855e; padding: 32px 24px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">UPGRADE REQUEST</h1>
                    </div>
                    <div style="padding: 32px 24px;">
                        <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.5;">A user has submitted a request to upgrade their plan.</p>
                        
                        <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                             <div style="margin-bottom: 16px;">
                                <p style="margin: 0 0 4px; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">User Identification</p>
                                <p style="margin: 0; font-weight: 700; color: #111827; font-size: 15px;">${user.firstName} ${user.lastName} (${user.email})</p>
                            </div>
                            <div style="margin-bottom: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 4px; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Target Plan</p>
                                <p style="margin: 0; font-weight: 700; color: #1e855e; font-size: 17px;">${targetPlan}</p>
                            </div>
                            <div style="padding-top: 16px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 8px; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Additional Comments</p>
                                <p style="margin: 0; color: #374151; line-height: 1.6; font-size: 14px;">${description || 'No additional comments provided.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Upgrade request successfully sent for ${user.email}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Upgrade Request Error:', error);
        res.status(500).json({ error: error.message || 'Server error while sending request' });
    }
});

async function ensureDatabaseSchemaPatches() {
    try {
        await pool.query(
            'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)'
        );
        await pool.query(
            'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstLoginAt" TIMESTAMP(3)'
        );
        await pool.query(
            'UPDATE "User" SET "firstLoginAt" = "lastLoginAt" WHERE "firstLoginAt" IS NULL AND "lastLoginAt" IS NOT NULL'
        );
    } catch (err) {
        console.error('[bootstrap] Schema patch (login timestamps) failed:', err.message);
    }
}

/** One-time legacy data fix: old sites stored creator id in Site.userId instead of auditee id. */
async function ensureLegacySiteUserIdsCleared() {
    try {
        const cleared = await clearLegacySiteUserIds();
        if (cleared > 0) {
            console.log(`[bootstrap] Cleared legacy Site.userId on ${cleared} site(s)`);
        }
    } catch (err) {
        console.error('[bootstrap] Legacy site userId cleanup failed:', err.message);
    }
}

Promise.all([ensureDatabaseSchemaPatches(), ensureSuperAdminUser(), ensureLegacySiteUserIdsCleared()])
    .then(([, user]) => {
        console.log(`[bootstrap] Super admin ready: ${user.email}`);
    })
    .catch((err) => {
        console.error('[bootstrap] Startup bootstrap failed:', err);
    })
    .finally(() => {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
        });
    });

// --- Graceful Shutdown Logic ---
const gracefulShutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    try {
        await prisma.$disconnect();
        console.log('Prisma disconnected.');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
