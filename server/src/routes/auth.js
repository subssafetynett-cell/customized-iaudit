import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma, {
    handlePrismaError,
    isPrismaUniqueViolation
} from '../prisma.js';
import {
    PERSON_NAME_MAX,
    sanitizePersonName,
    personNameValidationError,
    sanitizePhoneField,
    phoneFieldValidationError
} from '../textSanitize.js';
import {
    SESSION_EXPIRES_HEADER,
    clearSessionCookie,
    getSessionTokenFromRequest,
    sendAuthenticatedSession,
    LOGIN_MAX_FAILED_ATTEMPTS,
    loginIpRateLimit,
    createSessionTokenForUser,
    invalidateAllUserSessions,
    LOGIN_INVALID_CREDENTIALS_MESSAGE,
    LOGIN_ALLOWED_BODY_KEYS,
    SIGNUP_COMPLETE_ALLOWED_BODY_KEYS,
    FORGOT_PASSWORD_ALLOWED_BODY_KEYS,
    RESET_PASSWORD_ALLOWED_BODY_KEYS,
    getDisallowedExtraKeysError,
    LOGIN_SUCCESS_USER_SELECT,
    ensureUserTrialStarted
} from '../session.js';
import {
    sendOtpIpRateLimit,
    resetPasswordVerifyRateLimit,
    PASSWORD_RESET_CODE_MIN_LENGTH,
    PASSWORD_RESET_CODE_MAX_LENGTH,
    verificationCodesMatch,
    sendOtpToEmailAddress,
    sendPasswordChangedNotificationEmail
} from '../auth/otpMail.js';
import { ensureOrphanUserOrgLink } from '../orgAccess.js';
import {
    PASSWORD_REGEX,
    PASSWORD_REQUIREMENTS_MESSAGE,
    NEW_PASSWORD_SAME_AS_CURRENT_MESSAGE,
} from '../passwordPolicy.js';

async function handleVerifyOtpAndSignup(req, res) {
    const badKeys = getDisallowedExtraKeysError(req.body, SIGNUP_COMPLETE_ALLOWED_BODY_KEYS);
    if (badKeys) {
        return res.status(400).json({ error: badKeys });
    }

    let { email, otp, firstName, lastName, mobile, phoneCountry, password } = req.body;
    console.log(`[AUTH] Signup attempt for ${email}, password length: ${password?.length}`);

    if (!email || !otp || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email and OTP are required' });
    }
    email = email.toLowerCase().trim();

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    if (!PASSWORD_REGEX.test(password)) {
        return res.status(400).json({ error: PASSWORD_REQUIREMENTS_MESSAGE });
    }

    const fnErr = personNameValidationError(firstName, 'First name');
    const lnErr = personNameValidationError(lastName, 'Last name');
    if (fnErr || lnErr) {
        return res.status(400).json({ error: fnErr || lnErr });
    }
    const fn = sanitizePersonName(firstName, PERSON_NAME_MAX);
    const ln = sanitizePersonName(lastName, PERSON_NAME_MAX);

    const phoneOpts = { countryCode: phoneCountry };
    const mobileDigits = sanitizePhoneField(mobile, phoneOpts);
    if (!mobileDigits) {
        return res.status(400).json({
            error: phoneFieldValidationError(mobile, phoneOpts, 'Mobile number') || 'Mobile number is required.',
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

        try {
            await ensureUserTrialStarted(user.id);
        } catch (err) {
            console.warn('[AUTH] Trial/access grant skipped on signup:', err?.message || err);
        }

        const profile = await prisma.user.findUnique({
            where: { id: user.id },
            select: LOGIN_SUCCESS_USER_SELECT
        });
        if (!profile || String(profile.email || '').toLowerCase().trim() !== email) {
            return res.status(500).json({ error: 'Account creation could not be completed' });
        }

        let existingToken = null;
        try {
            existingToken = getSessionTokenFromRequest(req);
        } catch (err) {
            console.warn('[AUTH] Session cookie parse skipped on signup:', err?.message || err);
        }

        const session = await createSessionTokenForUser(profile.id, {
            existingToken,
        });

        res.status(201).json(sendAuthenticatedSession(res, profile, session));
    } catch (error) {
        console.error('Error creating user during OTP verification:', error);
        if (isPrismaUniqueViolation(error)) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user', details: error?.message || String(error) });
    }
}

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
        const isSchemaDrift =
            error.code === 'P2022' ||
            /column .* does not exist/i.test(error.message || '') ||
            /relation .* does not exist/i.test(error.message || '');
        res.status(isSchemaDrift ? 503 : 500).json({
            error: isSchemaDrift
                ? 'Database schema is out of date. Redeploy the API or run database migrations.'
                : `Failed during: ${step}`,
            message: error.message,
            code: error.code,
            step: step
        });
    }
};

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

// Also register under /api (mountedApiRouter) so Vite same-origin proxy always hits login
// before the /api strip path — keeps Set-Cookie on the /api response the browser expects.

async function handleAuthLogin(req, res) {
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
        if (typeof user.password === 'string' && user.password.length > 0) {
            try {
                isPasswordMatch = await bcrypt.compare(password, user.password);
            } catch {
                isPasswordMatch = false;
            }
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

        try {
            await ensureUserTrialStarted(user.id);
        } catch (err) {
            console.warn('[AUTH] Trial/access grant skipped:', err?.message || err);
        }

        // Repair broken invite links so existing teammates see shared company/site/user catalogs.
        await ensureOrphanUserOrgLink(user.id).catch((err) => {
            console.warn('[AUTH] Org link repair skipped:', err?.message || err);
        });

        const profile = await prisma.user.findUnique({
            where: { id: user.id },
            select: LOGIN_SUCCESS_USER_SELECT
        });
        if (!profile || String(profile.email || '').toLowerCase().trim() !== email) {
            return res.status(500).json({ error: 'Login could not be completed' });
        }

        let existingToken = null;
        try {
            existingToken = getSessionTokenFromRequest(req);
        } catch (err) {
            console.warn('[AUTH] Session cookie parse skipped:', err?.message || err);
        }

        const session = await createSessionTokenForUser(profile.id, {
            existingToken,
        });

        console.log(`[AUTH] Login successful for user: ${profile.id}, onboardingCompleted: ${profile.onboardingCompleted}`);
        res.status(200).json(sendAuthenticatedSession(res, profile, session));

    } catch (error) {
        handlePrismaError(error, 'login');
        console.error('[AUTH] Login failed:', error?.message || error, error?.code || '', error?.meta || '');
        res.status(500).json({ error: 'An error occurred during login' });
    }
}

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
    if (
        otpTrim.length < PASSWORD_RESET_CODE_MIN_LENGTH
        || otpTrim.length > PASSWORD_RESET_CODE_MAX_LENGTH
    ) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
        return res.status(400).json({
            error: PASSWORD_REQUIREMENTS_MESSAGE
        });
    }

    try {
        const user = await prisma.user.findFirst({
            where: { email },
            select: { id: true, isActive: true, email: true, firstName: true, lastName: true, password: true },
        });
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
        if (!verificationCodesMatch(storedData.code, otpTrim)) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        if (
            user.password
            && (await bcrypt.compare(String(newPassword), user.password))
        ) {
            return res.status(400).json({ error: NEW_PASSWORD_SAME_AS_CURRENT_MESSAGE });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword, failedLoginAttempts: 0 }
            }),
            prisma.otp.delete({ where: { email } }),
        ]);
        await invalidateAllUserSessions(user.id);
        clearSessionCookie(res);

        await sendPasswordChangedNotificationEmail({
            toEmail: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            changedBySelf: true,
        });

        return res.status(200).json({
            message: 'Password has been reset. You can sign in with your new password.',
            reauthRequired: true,
        });
    } catch (error) {
        console.error('reset-password error:', error);
        return res.status(500).json({ error: 'Could not reset password' });
    }
}

/** Log out the current browser/device only — other devices stay signed in. */
async function handleLogout(req, res) {
    try {
        const token =
            (typeof req.sessionToken === 'string' && req.sessionToken) ||
            getSessionTokenFromRequest(req);
        if (!token) {
            clearSessionCookie(res);
            return res.status(204).send();
        }
        const { count } = await prisma.session.deleteMany({ where: { token } });
        // Sweep expired rows for this token path; avoid leaving stale cookies confused.
        await prisma.session.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        }).catch(() => {});
        console.log(`[AUTH] Logout: removed ${count} session(s) for current device`);
        clearSessionCookie(res);
        res.status(204).send();
    } catch (error) {
        console.error('[AUTH] Logout error:', error);
        res.status(500).json({ error: 'Failed to log out' });
    }
}

/** Lightweight session check — renews sliding expiry and returns client sync timestamp. */

function handleAuthSession(req, res) {
    res.json({
        ok: true,
        sessionExpiresAt: req.sessionExpiresAt || res.getHeader(SESSION_EXPIRES_HEADER) || null,
    });
}

export {
    sendOtpLogic,
    handleVerifyOtpAndSignup,
    handleVerifyInvitedAccount,
    handleResendInviteVerification,
    handleAuthLogin,
    handleForgotPassword,
    handleResetPassword,
    handleLogout,
    handleAuthSession,
};

export function createAuthRouter({ authenticateToken }) {
    const router = Router();
    router.post('/auth/send-otp', sendOtpIpRateLimit, sendOtpLogic);
    router.post('/auth/signup', sendOtpIpRateLimit, sendOtpLogic);
    router.post('/auth/verify-otp-and-signup', handleVerifyOtpAndSignup);
    router.post('/auth/verify-invited-account', sendOtpIpRateLimit, handleVerifyInvitedAccount);
    router.post('/auth/resend-invite-verification', sendOtpIpRateLimit, handleResendInviteVerification);
    router.post('/auth/login', loginIpRateLimit, handleAuthLogin);
    router.post('/auth/forgot-password', sendOtpIpRateLimit, handleForgotPassword);
    router.post('/auth/reset-password', resetPasswordVerifyRateLimit, handleResetPassword);
    router.post('/auth/logout', authenticateToken, handleLogout);
    router.get('/auth/session', authenticateToken, handleAuthSession);
    return router;
}
