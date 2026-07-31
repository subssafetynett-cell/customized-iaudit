import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import prisma from '../prisma.js';
import { runOtpSendExclusive, withPgOtpAdvisoryLock } from '../otpSendLock.js';
import { escapeHtml } from '../textSanitize.js';

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
    greetingTimeout: 5000,   // 5 seconds
    socketTimeout: Number.parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS || '10000', 10) || 10000,
});

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/** High-entropy password reset token (PSZL-009 — not brute-forceable like 6 digits). */
const PASSWORD_RESET_TOKEN_BYTES = 24;
const PASSWORD_RESET_CODE_MIN_LENGTH = 20;
const PASSWORD_RESET_CODE_MAX_LENGTH = 256;

function generateVerificationCode(purpose) {
    if (purpose === 'password_reset') {
        return crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('base64url');
    }
    return generateOTP();
}

function verificationCodesMatch(stored, provided) {
    if (typeof stored !== 'string' || typeof provided !== 'string') {
        return false;
    }
    const a = Buffer.from(stored);
    const b = Buffer.from(provided);
    if (a.length !== b.length) {
        return false;
    }
    return crypto.timingSafeEqual(a, b);
}

function getOtpTtlMinutes(purpose) {
    if (purpose === 'signup') return 1;
    if (purpose === 'password_reset') return 5;
    if (purpose === 'email_change') return 15;
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

/**
 * Send invite/welcome OTP email after the HTTP response so the UI is not blocked by SMTP latency.
 */
function queueInviteOnboardingEmail(normalizedEmail, inviteEmailOptions = {}) {
    void sendOtpToEmailAddress(normalizedEmail, 'user_invite', inviteEmailOptions)
        .then((result) => {
            console.log(
                `[invite] Onboarding email to ${normalizedEmail}: transmitted=${result?.emailTransmitted === true}`,
            );
        })
        .catch((otpErr) => {
            console.error(
                `[invite] Failed to send onboarding email to ${normalizedEmail}:`,
                otpErr?.message || otpErr,
            );
        });
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

/** PSZL-019 / VDP-020: notify account owner after a successful password change. */
async function sendPasswordChangedNotificationEmail({ toEmail, firstName, lastName, changedBySelf = true }) {
    if (!isSmtpConfigured()) {
        console.warn('[AUTH] SMTP not configured; skipping password change notification email.');
        return { sent: false, skipped: true };
    }
    const normalizedTo = String(toEmail || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedTo)) {
        return { sent: false, skipped: true };
    }

    const displayName = escapeHtml(`${firstName || ''} ${lastName || ''}`.trim() || 'there');
    const safeEmail = escapeHtml(normalizedTo);
    const loginUrl = getAppLoginUrl();
    const changedAt = new Date().toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'UTC',
    });
    const intro = changedBySelf
        ? 'Your iAudit Global account password was changed successfully.'
        : 'The password for your iAudit Global account was changed by an administrator.';

    const subject = 'Your iAudit Global password was changed';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
            <div style="background:#213847;padding:24px 28px;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Password changed</h1>
            </div>
            <div style="background:#ffffff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
                <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Hello ${displayName},</p>
                <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${intro}</p>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0;">
                    <p style="margin:0 0 6px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">When</p>
                    <p style="margin:0;font-size:14px;font-weight:600;">${escapeHtml(changedAt)} UTC</p>
                </div>
                <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 20px;">
                    If you did not make this change, contact us immediately at
                    <a href="mailto:support@iaudit.global" style="color:#1e855e;">support@iaudit.global</a>
                    and reset your password using the forgot-password flow on the sign-in page.
                </p>
                <p style="margin:24px 0;">
                    <a href="${loginUrl}" style="display:inline-block;background:#1e855e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">
                        Sign in
                    </a>
                </p>
                <hr style="border:0;border-top:1px solid #e5e7eb;margin:28px 0;" />
                <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
                    This security notification was sent to ${safeEmail}. Please do not reply to this automated message.
                </p>
            </div>
        </div>
    `;
    const text = [
        `Hello ${`${firstName || ''} ${lastName || ''}`.trim() || 'there'},`,
        '',
        intro,
        '',
        `Time (UTC): ${changedAt}`,
        '',
        'If you did not make this change, contact support@iaudit.global immediately.',
        '',
        `Sign in: ${loginUrl}`,
    ].join('\n');

    try {
        await transporter.sendMail({
            from: { name: 'iAudit Global', address: getSmtpFromAddress() },
            to: normalizedTo,
            subject,
            html,
            text,
        });
        console.log(`[AUTH] Password change notification sent to ${normalizedTo}`);
        return { sent: true };
    } catch (err) {
        console.error('[AUTH] Failed to send password change notification:', err.message);
        return { sent: false, error: err.message };
    }
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

        const otp = generateVerificationCode(purpose);
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
                        ${isPasswordReset
                            ? `<p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827; word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; line-height: 1.5;">${escapeHtml(otp)}</p>`
                            : `<h2 style="font-size: 42px; font-weight: 800; color: #111827; letter-spacing: 8px; margin: 0;">${otp}</h2>`}
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
        const deliverMail = async () => {
            if (devConsoleOnly) {
                console.log('\n====================================================================');
                console.log(`[DEV OTP] ${purpose} for ${normalizedEmail}: ${otp}`);
                console.log(`          Expires in ${ttlMinutes} minutes (SMTP not configured).`);
                console.log('====================================================================\n');
                return true;
            }
            await transporter.sendMail(mailOptions);
            console.log(`OTP successfully sent to ${normalizedEmail}`);
            return true;
        };

        try {
            if (options.backgroundDelivery === true) {
                // Persist OTP first, then deliver mail off the request path (invite UX ≤1s).
                emailTransmitted = true;
                setImmediate(() => {
                    void deliverMail().catch(async (emailError) => {
                        console.error('Background invite email failed:', emailError.message);
                        if (allowDevConsoleOtp()) {
                            console.log('\n====================================================================');
                            console.log(`[DEV OTP] ${purpose} for ${normalizedEmail}: ${otp}`);
                            console.log(`          Expires in ${ttlMinutes} minutes (email send failed; use code above).`);
                            console.log('====================================================================\n');
                            return;
                        }
                        // Keep OTP so Resend verification still works; do not delete on background failure.
                    });
                });
            } else if (devConsoleOnly) {
                emailTransmitted = await deliverMail();
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

export {
    OTP_RESEND_COOLDOWN_MS,
    otpSendCooldownByEmail,
    otpSendInFlight,
    OTP_SEND_IP_WINDOW_MS,
    OTP_SEND_IP_MAX_IN_WINDOW,
    otpSendIpBuckets,
    RESET_PASSWORD_VERIFY_WINDOW_MS,
    RESET_PASSWORD_VERIFY_MAX_PER_IP,
    RESET_PASSWORD_VERIFY_MAX_PER_EMAIL,
    resetPasswordVerifyIpBuckets,
    resetPasswordVerifyEmailBuckets,
    getClientIp,
    throwOtpCooldownError,
    acquireOtpSendSlot,
    releaseOtpSendSlot,
    sendOtpIpRateLimit,
    resetPasswordVerifyRateLimit,
    transporter,
    generateOTP,
    PASSWORD_RESET_TOKEN_BYTES,
    PASSWORD_RESET_CODE_MIN_LENGTH,
    PASSWORD_RESET_CODE_MAX_LENGTH,
    generateVerificationCode,
    verificationCodesMatch,
    getOtpTtlMinutes,
    formatOtpExpiryLabel,
    isSmtpConfigured,
    SMTP_FROM_DEFAULT,
    getSmtpFromAddress,
    assertSmtpConfiguredForOtp,
    allowDevConsoleOtp,
    queueInviteOnboardingEmail,
    sendOtpToEmailAddress,
    getAppLoginUrl,
    sendPasswordChangedNotificationEmail,
    buildUserInviteWelcomeMailContent,
    sendOtpToEmailAddressUnderLock,
};
