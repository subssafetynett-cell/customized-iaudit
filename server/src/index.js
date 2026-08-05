import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { loadServerEnv } from './loadEnv.js';
import prisma, { pool } from './prisma.js';
import Stripe from 'stripe';
import { ensureSuperAdminUser } from './ensureSuperAdmin.js';
import { createNonconformanceRouter } from './nonconformance/index.js';
import { createNotificationsRouter } from './notifications/index.js';
import {
    getSessionTokenFromRequest,
    maybeRenewSessionExpiry,
    SESSION_EXPIRES_HEADER,
    appendSessionCookie,
    loginIpRateLimit,
} from './session.js';
import {
    checkTrialExpiration,
    actorCanAccessAuditPlan,
    clearLegacySiteUserIds,
    repairOrgCreatorLinks,
} from './orgAccess.js';
import {
    sendOtpIpRateLimit,
    resetPasswordVerifyRateLimit,
    transporter,
} from './auth/otpMail.js';
import {
    createHealthRouter,
    apiHealthHandler,
    setBootstrapComplete,
    setDbHealthy,
    withTimeout,
} from './routes/health.js';
import { createCompaniesRouter } from './routes/companies.js';
import { createSitesDepartmentsRouter } from './routes/sitesDepartments.js';
import {
    createAuthRouter,
    handleForgotPassword,
    handleResetPassword,
    handleAuthLogin,
    handleLogout,
    handleAuthSession,
    sendOtpLogic,
    handleVerifyInvitedAccount,
    handleResendInviteVerification,
} from './routes/auth.js';
import { createUsersRouter, postUserEmailChangeSendOtp } from './routes/users.js';
import { createAuditsRouter } from './routes/audits.js';
import { createAssessmentsRouter } from './routes/assessments.js';
import { createBillingRouter } from './routes/billing.js';
import { registerUploadRoutes } from './routes/uploads.js';

loadServerEnv();

const app = express();
const PORT = process.env.PORT || 3001;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    // Fail external calls before Coolify/proxy gateway timeouts (~30–60s).
    timeout: Number.parseInt(process.env.STRIPE_TIMEOUT_MS || '15000', 10) || 15000,
    maxNetworkRetries: Number.parseInt(process.env.STRIPE_MAX_RETRIES || '1', 10) || 1,
});

/** Routes registered here run while the URL still starts with `/api/` (before the strip below). */
const mountedApiRouter = express.Router();
// This router is mounted before global express.json(); parse JSON for all /api/* handlers on it.
mountedApiRouter.use(express.json({ limit: '50mb' }));

const CORS_ALLOWED_ORIGINS = new Set([
    'https://iaudit.global',
    'https://api.iaudit.global',
    'https://apps.iaudit.global',
    'https://szl.iaudit.global',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
]);

app.use(compression({ threshold: 1024 }));

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
        // Reject without throwing — throwing becomes a 500 and can surface as gateway errors.
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Cache-Control',
        'Pragma',
        'Expires',
        'x-user-id',
        'X-Super-Admin-Console',
        'X-Session-Expires-At',
    ],
    exposedHeaders: ['X-Session-Expires-At'],
}));

// Fail hung requests before Cloudflare's ~100s gateway timeout.
app.use((req, res, next) => {
    req.setTimeout(60_000);
    res.setTimeout(60_000);
    next();
});

// Full `/api/auth/...` paths must be registered before `app.use('/api', mountedApiRouter)` so they are
// not lost when the sub-router has no match (and so they work even if `/auth/...` aliases are missing).
app.post('/api/auth/forgot-password', express.json({ limit: '50mb' }), sendOtpIpRateLimit, handleForgotPassword);
app.post('/api/auth/reset-password', express.json({ limit: '50mb' }), resetPasswordVerifyRateLimit, handleResetPassword);

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

                    // Never bare-return here — that leaves the HTTP connection open → Coolify/proxy 504.
                    if (!planStartDate || Number.isNaN(planStartDate.getTime())) {
                        console.error("Invalid planStartDate — skipping checkout.session.completed date block");
                        break;
                    }

                    if (!planExpiryDate || Number.isNaN(planExpiryDate.getTime())) {
                        console.error("Invalid planExpiryDate — skipping checkout.session.completed date block");
                        break;
                    }

                    if (!nextBillingDate || Number.isNaN(nextBillingDate.getTime())) {
                        console.error("Invalid nextBillingDate — skipping checkout.session.completed date block");
                        break;
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
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' https://iaudit.global https://*.iaudit.global; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "script-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https://iaudit.global https://*.iaudit.global https://fonts.googleapis.com https://res.cloudinary.com https://*.cloudinary.com; " +
        "frame-ancestors 'self';"
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


// Middleware: validate server-side session (DB row); token is read from httpOnly cookie (preferred) or Bearer header.
const authenticateToken = async (req, res, next) => {
    const token = getSessionTokenFromRequest(req);

        if (!token) {
        console.warn(
            `[SECURITY] Access denied to ${req.originalUrl || req.url || req.path}. No session token provided.`,
        );
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

        const sessionExpiresAt = await maybeRenewSessionExpiry(session.token, session.expiresAt);
        res.setHeader(SESSION_EXPIRES_HEADER, sessionExpiresAt);
        appendSessionCookie(res, session.token, sessionExpiresAt);

        req.sessionToken = token;
        req.sessionExpiresAt = sessionExpiresAt;
        req.user = {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role
        };
        next();
    } catch (err) {
        console.error(`[SECURITY] Session lookup failed for ${req.path}:`, err.message);
        return res.status(503).json({ error: 'Authentication service temporarily unavailable. Please try again.' });
    }
};


const routeDeps = { authenticateToken, checkTrialExpiration };

// Multipart uploads (must not rely on express.json body parsing)
registerUploadRoutes(app, routeDeps);
registerUploadRoutes(mountedApiRouter, routeDeps);

// Nonconformance APIs (modular)
app.use(
    '/nonconformances',
    createNonconformanceRouter({
        authenticateToken,
        checkTrialExpiration,
        actorCanAccessAuditPlan,
    }),
);

app.use(
    '/notifications',
    createNotificationsRouter({
        authenticateToken,
        checkTrialExpiration,
    }),
);

app.use(createHealthRouter());
app.get('/api/health', apiHealthHandler);
mountedApiRouter.get('/health', apiHealthHandler);

app.use(createCompaniesRouter(routeDeps));
app.use(createSitesDepartmentsRouter(routeDeps));

// Auth — triple registration preserved for /api + mountedApiRouter + /auth
const authJson = express.json({ limit: '50mb' });
app.post('/api/auth/send-otp', authJson, sendOtpIpRateLimit, sendOtpLogic);
app.post('/api/auth/signup', authJson, sendOtpIpRateLimit, sendOtpLogic);
mountedApiRouter.post('/auth/send-otp', sendOtpIpRateLimit, sendOtpLogic);
mountedApiRouter.post('/auth/signup', sendOtpIpRateLimit, sendOtpLogic);
app.post('/api/auth/verify-invited-account', authJson, sendOtpIpRateLimit, handleVerifyInvitedAccount);
app.post('/api/auth/resend-invite-verification', authJson, sendOtpIpRateLimit, handleResendInviteVerification);
mountedApiRouter.post('/auth/verify-invited-account', sendOtpIpRateLimit, handleVerifyInvitedAccount);
mountedApiRouter.post('/auth/resend-invite-verification', sendOtpIpRateLimit, handleResendInviteVerification);
mountedApiRouter.post('/auth/login', loginIpRateLimit, handleAuthLogin);
app.post('/api/auth/login', express.json({ limit: '50mb' }), loginIpRateLimit, handleAuthLogin);
app.post('/api/auth/logout', authenticateToken, handleLogout);
mountedApiRouter.post('/auth/logout', authenticateToken, handleLogout);
app.get('/api/auth/session', authenticateToken, handleAuthSession);
mountedApiRouter.get('/auth/session', authenticateToken, handleAuthSession);
app.use(createAuthRouter({ authenticateToken }));

app.use(createUsersRouter(routeDeps));
mountedApiRouter.post(
    '/users/:id/email-change/send-otp',
    express.json({ limit: '50mb' }),
    authenticateToken,
    postUserEmailChangeSendOtp,
);

app.use(createAuditsRouter(routeDeps));
app.use(createAssessmentsRouter(routeDeps));
app.use(createBillingRouter({ ...routeDeps, stripe, transporter }));

// =====================================================================
// STARTUP — listen FIRST, then bootstrap in the background WITHOUT
// blocking the event loop (async migrate — never spawnSync).
// =====================================================================

async function ensureDatabaseSchemaPatches() {
    try {
        await pool.query(
            'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)'
        );
        await pool.query(
            'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstLoginAt" TIMESTAMP(3)'
        );
        await pool.query(
            'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0'
        );
        await pool.query(
            'UPDATE "User" SET "firstLoginAt" = "lastLoginAt" WHERE "firstLoginAt" IS NULL AND "lastLoginAt" IS NOT NULL'
        );
        // Session table is required for login; create if migrate lagged behind traffic.
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
        await pool.query(
            `CREATE INDEX IF NOT EXISTS "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt")`
        );
        // Best-effort FK (ignore if User table / constraint already exists under another name).
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
        // Findings inbox email indexes (also in prisma migration; IF NOT EXISTS for race-safe bootstrap).
        await pool.query(
            `ALTER TABLE "AuditPlan" ADD COLUMN IF NOT EXISTS "assigneeEmails" TEXT[] DEFAULT ARRAY[]::TEXT[]`
        );
        await pool.query(
            `ALTER TABLE "AuditPlan" ADD COLUMN IF NOT EXISTS "raisedByEmails" TEXT[] DEFAULT ARRAY[]::TEXT[]`
        );
        await pool.query(
            `CREATE INDEX IF NOT EXISTS "AuditPlan_assigneeEmails_gin" ON "AuditPlan" USING GIN ("assigneeEmails")`
        );
        await pool.query(
            `CREATE INDEX IF NOT EXISTS "AuditPlan_raisedByEmails_gin" ON "AuditPlan" USING GIN ("raisedByEmails")`
        );
    } catch (err) {
        console.error('[bootstrap] Schema patch (login timestamps / session / finding emails) failed:', err.message);
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

/** One-time-ish backfill of finding email indexes for recent plans (non-blocking, bounded). */
async function backfillAuditPlanFindingEmails() {
    try {
        const { rows } = await pool.query(
            `SELECT id, "auditData" FROM "AuditPlan"
             WHERE "auditData" IS NOT NULL
               AND (
                 cardinality(COALESCE("assigneeEmails", ARRAY[]::text[])) = 0
                 OR cardinality(COALESCE("raisedByEmails", ARRAY[]::text[])) = 0
               )
               AND "updatedAt" > NOW() - INTERVAL '180 days'
             ORDER BY "updatedAt" DESC
             LIMIT 200`,
        );
        if (!rows?.length) return;
        const { syncAuditPlanFindingEmails } = await import('./audit/findingsInbox.js');
        let n = 0;
        for (const row of rows) {
            await syncAuditPlanFindingEmails(row.id, row.auditData);
            n += 1;
        }
        console.log(`[bootstrap] Backfilled finding email indexes on ${n} plan(s)`);
    } catch (err) {
        console.warn('[bootstrap] Finding email backfill skipped:', err.message);
    }
}

/** Wait for Postgres to accept connections (retries with exponential backoff). */
async function waitForDatabase(maxRetries = 20, initialDelayMs = 500) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await withTimeout(pool.query('SELECT 1'), 5000, 'startup DB connect');
            console.log(`[bootstrap] ✔ Database connected (attempt ${attempt})`);
            setDbHealthy(true);
            return;
        } catch (err) {
            const delay = Math.min(initialDelayMs * 2 ** (attempt - 1), 10000);
            console.warn(
                `[bootstrap] Database not ready (attempt ${attempt}/${maxRetries}): ${err.message} — retrying in ${delay}ms`,
            );
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw new Error('Database did not become available after retries');
}

/** Async migrate deploy — must NOT use spawnSync (blocks event loop → 504). */
async function runMigrations() {
    const { runPrismaMigrateDeploy } = await import('./runMigrateAsync.js');

    console.log('[bootstrap] Applying database migrations (async, non-blocking)…');
    const result = await runPrismaMigrateDeploy(process.env.DATABASE_URL);

    if (result.status === 0) {
        console.log('[bootstrap] ✔ Migrations applied');
        return;
    }
    if (/P3005/.test(result.output)) {
        // Never call spawnSync baseline here — it freezes the event loop → Traefik 504.
        console.error(
            '[bootstrap] Database needs baselining (P3005). Skipping auto-baseline to keep HTTP alive. Run: npm run db:baseline',
        );
        return;
    }
    console.error(`[bootstrap] Migration exited with code ${result.status}`);
}

async function runBootstrap() {
    const t0 = Date.now();
    try {
        console.log('[bootstrap] Starting…');
        await waitForDatabase();
        console.log('[bootstrap] ✔ Prisma / pg pool ready');
        await runMigrations();
        await Promise.all([
            ensureDatabaseSchemaPatches(),
            ensureSuperAdminUser().then((user) => {
                console.log(`[bootstrap] ✔ Super admin ready: ${user.email}`);
            }),
            ensureLegacySiteUserIdsCleared(),
        ]);
        // Mark ready BEFORE heavy backfills so Coolify/Traefik health checks pass quickly.
        setBootstrapComplete(true);
        console.log(`[bootstrap] ✔ Ready for traffic in ${Date.now() - t0}ms`);

        // Heavy org repair + email backfill must not delay readiness (public 504 risk).
        void repairOrgCreatorLinks()
            .then((repaired) => {
                if (repaired > 0) {
                    console.log(`[bootstrap] ✔ Re-linked ${repaired} org member(s) with missing creatorId`);
                }
            })
            .catch((err) => {
                console.warn('[bootstrap] Org creatorId repair skipped:', err?.message || err);
            });
        void backfillAuditPlanFindingEmails();
    } catch (err) {
        console.error('[bootstrap] Startup bootstrap failed:', err);
        // Don't crash — /health stays 503 until DB recovers; /live stays 200.
    }
}

console.log('[start] Server starting…');
console.log(`[start] NODE_ENV=${process.env.NODE_ENV || 'development'} PORT=${PORT}`);

// 1. Open the port immediately (eliminates the connection-refused 502 window).
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[start] ✔ Listening on 0.0.0.0:${PORT}`);
    console.log('[start] ✔ Routes registered');
    console.log('[start] ✔ Health endpoints ready: /live /health /api/health');
});

// Keep-alive MUST exceed reverse-proxy idle/read timeouts (nginx proxy_* = 120s).
// If Node closes idle sockets first, nginx reuses a dead connection → intermittent 502.
server.keepAliveTimeout = 130000;
server.headersTimeout = 131000;
server.requestTimeout = 0;

// Warm login schema ASAP so the first POST /auth/login does not race migrate.
import('./session.js')
    .then(({ ensureLoginSchemaReady }) => ensureLoginSchemaReady())
    .then(() => console.log('[start] ✔ Login schema ready'))
    .catch((err) => console.warn('[start] Login schema warm-up deferred:', err?.message || err));

// 2. Migrations / seeds in background without freezing HTTP.
runBootstrap();

// =====================================================================
// GRACEFUL SHUTDOWN — drain HTTP before closing pools.
// =====================================================================
let shuttingDown = false;

const gracefulShutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received — shutting down gracefully…`);

    const forceExitTimer = setTimeout(() => {
        console.error('[shutdown] Timed out — forcing exit');
        process.exit(1);
    }, 15000);
    forceExitTimer.unref();

    await new Promise((resolveClose) => {
        server.close((err) => {
            if (err) console.error('[shutdown] server.close error:', err.message);
            else console.log('[shutdown] ✔ HTTP server closed');
            resolveClose();
        });
    });

    try {
        await prisma.$disconnect();
        console.log('[shutdown] ✔ Prisma disconnected');
    } catch (err) {
        console.error('[shutdown] Prisma disconnect error:', err.message);
    }

    try {
        await pool.end();
        console.log('[shutdown] ✔ pg Pool closed');
    } catch (err) {
        console.error('[shutdown] pg Pool close error:', err.message);
    }

    clearTimeout(forceExitTimer);
    process.exit(signal === 'uncaughtException' ? 1 : 0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught exception:', err);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
    console.error('[WARN] Unhandled promise rejection:', reason);
});

