import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import prisma, { handlePrismaError } from './prisma.js';
import bcrypt from 'bcrypt';
import Stripe from 'stripe';
import { STRIPE_CONFIG } from './stripe-config.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Compatibility Middleware: Strips /api prefix for local development
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        req.url = req.url.replace('/api', '');
    }
    next();
});

app.use(cors({
    origin: ['https://iaudit.global', 'https://api.iaudit.global', 'https://apps.iaudit.global', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080', 'http://localhost:8081'], // Allow production and local development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires']
}));

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

                // Send invoice + receipt email to user
                try {
                    // Fetch the invoice with deep expansion to get receipt URL (same as billing history)
                    const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
                        expand: ['charge', 'payment_intent.latest_charge']
                    });

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
        "default-src 'self' https://iaudit.global https://api.iaudit.global https://apps.iaudit.global; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "script-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "connect-src 'self' https://iaudit.global https://api.iaudit.global https://apps.iaudit.global https://fonts.googleapis.com;"
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
    // Get userId from query, body, or params
    const userId = req.query.userId || req.body.userId || req.params.userId || req.headers['x-user-id'];

    if (!userId || userId === 'undefined' || userId === 'null') {
        return next();
    }

    try {
        const parsedUserId = Number.parseInt(userId);
        if (Number.isNaN(parsedUserId)) return next();

        const user = await prisma.user.findUnique({
            where: { id: parsedUserId },
            select: { subscriptionStatus: true, trialEndDate: true }
        });

        if (!user) return next();

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

const router = express.Router();

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
        ciphers: 'SSLv3',
        rejectUnauthorized: false
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

// Temporary in-memory store for OTPs - REMOVED for AWS scalability
// const otpStore = new Map();

// Helper function to generate a 6 digit code
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
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
app.get('/companies', checkTrialExpiration, async (req, res) => {
    const { userId, admin } = req.query;
    console.log(`[DEBUG] GET /companies called with userId: ${userId}, admin: ${admin}`);

    try {
        if (admin === 'true') {
            const companies = await prisma.company.findMany({
                include: {
                    sites: {
                        include: { departments: true }
                    }
                }
            });
            console.log(`[DEBUG] Fetched ${companies.length} companies for Admin.`);
            return res.json(companies);
        }

        // SECURITY: Enforce strict userId filtering. Do not return all companies if userId is missing.
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.warn(`[SECURITY] GET /companies called without valid userId. Returning empty list.`);
            return res.json([]);
        }
        const parsedUserId = Number.parseInt(userId);
        if (Number.isNaN(parsedUserId)) {
            return res.json([]);
        }

        const whereClause = { userId: parsedUserId };
        console.log(`[DEBUG] Querying companies with whereClause:`, whereClause);

        const companies = await prisma.company.findMany({
            where: whereClause,
            include: {
                sites: {
                    where: { userId: parsedUserId },
                    include: {
                        departments: true
                    }
                }
            }
        });

        console.log(`[DEBUG] Successfully fetched ${companies.length} companies for userId ${parsedUserId}.`);
        res.json(companies);
    } catch (error) {
        console.error('Failed to fetch companies:', error);
        res.status(500).json({ error: 'Failed to fetch companies', details: error.message || String(error) });
    }
});

// Create a site
app.post('/companies/:companyId/sites', checkTrialExpiration, async (req, res) => {
    const { companyId } = req.params;
    const {
        name, description, siteType, status,
        address, city, state, country, postalCode,
        latitude, longitude, contactName, contactPosition,
        contactNumber, email, userId
    } = req.body;
    try {
        const site = await prisma.site.create({
            data: {
                name,
                description,
                siteType,
                status: status || 'Active',
                address,
                city,
                state,
                country,
                postalCode,
                latitude: latitude != null && String(latitude).trim() !== '' && !Number.isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null,
                longitude: longitude != null && String(longitude).trim() !== '' && !Number.isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null,
                contactName,
                contactPosition,
                contactNumber,
                email,
                companyId: Number.parseInt(companyId),
                userId: userId ? Number.parseInt(userId) : null
            }
        });
        res.status(201).json(site);
    } catch (error) {
        console.error('Error creating site:', error);
        res.status(500).json({ error: 'Failed to create site', details: error.message || String(error) });
    }
});

// Get all sites (with strict user filtering for security)
app.get('/sites', checkTrialExpiration, async (req, res) => {
    const { userId } = req.query;

    // SECURITY: Enforce strict userId filtering. Do not return all sites if userId is missing.
    if (!userId || userId === 'undefined' || userId === 'null') {
        return res.json([]);
    }

    try {
        const parsedUserId = Number.parseInt(userId);
        if (Number.isNaN(parsedUserId)) {
            return res.json([]);
        }

        const sites = await prisma.site.findMany({
            where: { userId: parsedUserId },
            include: {
                company: true
            }
        });
        res.json(sites);
    } catch (error) {
        console.error('Failed to fetch sites:', error);
        res.status(500).json({ error: 'Failed to fetch sites' });
    }
});

// Update a site
app.put('/sites/:id', checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const {
        name, description, siteType, status,
        address, city, state, country, postalCode,
        latitude, longitude, contactName, contactPosition,
        contactNumber, email
    } = req.body;
    try {
        const site = await prisma.site.update({
            where: { id: Number.parseInt(id) },
            data: {
                name,
                description,
                siteType,
                status,
                address,
                city,
                state,
                country,
                postalCode,
                latitude: latitude != null && String(latitude).trim() !== '' && !Number.isNaN(parseFloat(latitude)) ? parseFloat(latitude) : null,
                longitude: longitude != null && String(longitude).trim() !== '' && !Number.isNaN(parseFloat(longitude)) ? parseFloat(longitude) : null,
                contactName,
                contactPosition,
                contactNumber,
                email
            }
        });
        res.json(site);
    } catch (error) {
        console.error('Error updating site:', error);
        res.status(500).json({ error: 'Failed to update site' });
    }
});

// Delete a site
app.delete('/sites/:id', checkTrialExpiration, async (req, res) => {
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
app.post('/sites/:siteId/departments', checkTrialExpiration, async (req, res) => {
    const { siteId } = req.params;
    const { name, code, status, manager, description } = req.body;
    try {
        const department = await prisma.department.create({
            data: {
                name,
                code,
                status: status || 'Active',
                manager,
                description,
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
app.put('/departments/:id', checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const { name, code, status, manager, description } = req.body;
    try {
        const department = await prisma.department.update({
            where: { id: Number.parseInt(id) },
            data: { name, code, status, manager, description }
        });
        res.json(department);
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: 'Failed to update department' });
    }
});

// Delete a department
app.delete('/departments/:id', checkTrialExpiration, async (req, res) => {
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
app.post('/companies', checkTrialExpiration, async (req, res) => {
    const {
        name, industry, description, logo,
        contactNumber, streetAddress, city,
        state, country, postalCode, standards, userId
    } = req.body;
    try {
        const parsedUserId = userId ? Number.parseInt(userId) : null;

        // Enforce One Company Per User Rule
        if (parsedUserId) {
            const existingCompany = await prisma.company.findFirst({
                where: { userId: parsedUserId }
            });
            if (existingCompany) {
                return res.status(400).json({ error: 'User already has a registered company. Only one company is allowed per user.' });
            }
        }

        const company = await prisma.company.create({
            data: {
                name,
                industry,
                description,
                logo,
                contactNumber,
                streetAddress,
                city,
                state,
                country,
                postalCode,
                isoStandards: standards || [],
                // Automatically set legacy fields for compatibility
                location: `${city || ''}, ${country || ''}`.trim().replace(/^, |,$/, ''),
                contactDetails: contactNumber,
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
app.put('/companies/:id', checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const {
        name, industry, description, logo,
        contactNumber, streetAddress, city,
        state, country, postalCode, standards
    } = req.body;
    try {
        const company = await prisma.company.update({
            where: { id: Number.parseInt(id) },
            data: {
                name,
                industry,
                description,
                logo,
                contactNumber,
                streetAddress,
                city,
                state,
                country,
                postalCode,
                isoStandards: standards || [],
                location: `${city || ''}, ${country || ''}`.trim().replace(/^, |,$/, ''),
                contactDetails: contactNumber
            },
        });
        res.json(company);
    } catch (error) {
        console.error('Error updating company:', error);
        res.status(500).json({ error: 'Failed to update company' });
    }
});

// Delete a company
app.delete('/companies/:id', checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.company.delete({
            where: { id: Number.parseInt(id) },
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

// Alias for signup if frontend calls /auth/signup directly
// Refactored Send OTP logic to be reusable
const sendOtpLogic = async (req, res) => {
    let { email } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email is required' });
    }
    email = email.toLowerCase().trim();

    let step = 'Lookup existing user';
    try {
        console.log(`[AUTH] Signup attempt`);
        // 1. Prevent signup if user already exists
        const existingUser = await prisma.user.findFirst({ where: { email } });
        console.log(`[AUTH] User lookup result:`, existingUser ? 'Found' : 'Not Found');
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        step = 'Generate and Store OTP';
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 1 * 60 * 1000); // 1 minute expiration

        // Store OTP in database
        await prisma.otp.upsert({
            where: { email },
            update: { code: otp, expiresAt },
            create: { email, code: otp, expiresAt }
        });

        const mailOptions = {
            from: {
                name: 'iAudit Global',
                address: process.env.SMTP_USER
            },
            to: email,
            subject: 'Your Account Verification Code',
            headers: {
                'X-Entity-Ref-ID': otp,
            },
            text: `Your verification code is: ${otp}. This code will expire in 1 minute.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #00875b; font-size: 28px; margin: 0;">Welcome to iAudit Global</h1>
                    </div>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                        Hello!<br><br>
                        Please use the verification code below to confirm your email address and complete your signup securely:
                    </p>
                    
                    <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 32px;">
                        <p style="text-transform: uppercase; font-size: 14px; font-weight: 600; color: #6b7280; margin: 0 0 12px 0; letter-spacing: 1px;">Secure Verification Code</p>
                        <h2 style="font-size: 42px; font-weight: 800; color: #111827; letter-spacing: 8px; margin: 0;">${otp}</h2>
                    </div>
                    
                    <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
                        This code will expire in <strong>1 minute</strong>. If you did not request this verification, your account is safe, and you can safely ignore this email.
                    </p>
                    
                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
                    
                    <div style="text-align: center; color: #9ca3af; font-size: 12px;">
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} iAudit Global. All rights reserved.</p>
                        <p style="margin: 4px 0 0 0;">This email was sent to ${email}. Please do not reply to this automated message.</p>
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`OTP successfully sent to ${email}`);
        } catch (emailError) {
            console.error('Email sending failed, but continuing for development/test:', emailError.message);
            if (emailError.message.includes('5.7.139')) {
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
            console.log(`Bypassed Email - OTP for ${email} is: ${otp}`);
        }
        res.status(200).json({ message: 'OTP sent successfully (Bypassed if email failed)' });

    } catch (error) {
        handlePrismaError(error, `sendOtpLogic at step: ${step}`);
        res.status(500).json({
            error: `Failed during: ${step}`,
            message: error.message,
            code: error.code,
            step: step
        });
    }
};

app.post('/auth/send-otp', sendOtpLogic);
app.post('/auth/signup', sendOtpLogic);

app.post('/auth/verify-otp-and-signup', async (req, res) => {
    let { email, otp, firstName, lastName, mobile, password, role, customRoleName, isActive } = req.body;

    if (!email || !otp || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email and OTP are required' });
    }
    email = email.toLowerCase().trim();

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
                firstName,
                lastName,
                email,
                mobile,
                role: role || 'Admin',
                customRoleName,
                isActive: isActive !== undefined ? isActive : true,
                password: hashedPassword
            }
        });

        // Clean up OTP from database
        await prisma.otp.delete({ where: { email } });

        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error('Error creating user during OTP verification:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.post('/auth/login', async (req, res) => {
    let { email, password } = req.body;

    if (!email || !password || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email and password are required' });
    }
    email = email.toLowerCase().trim();

    try {
        console.log(`[AUTH] Login attempt`);
        const user = await prisma.user.findFirst({
            where: { email: email }
        });

        if (!user) {
            console.log(`[AUTH] Login failed: User not found`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log(`[AUTH] User found for login: ${user.id}`);

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
                await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
                isPasswordMatch = true;
            } else {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        // Return the full user object (including trial/subscription status) to the frontend
        const { password: _, ...userWithoutPassword } = user;
        console.log(`[AUTH] Login successful for user: ${user.id}, onboardingCompleted: ${user.onboardingCompleted}`);
        res.status(200).json(userWithoutPassword);

    } catch (error) {
        handlePrismaError(error, 'login');
        res.status(500).json({ error: 'An error occurred during login', details: error.message });
    }
});

// User routes
app.get('/users', async (req, res) => {
    const { creatorId } = req.query;
    try {
        const whereClause = creatorId ? { creatorId: Number.parseInt(creatorId) } : {};
        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
                role: true,
                customRoleName: true,
                isActive: true,
                createdAt: true
            }
        });
        res.json(users);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get single user status quickly
app.get('/users/:id/status', async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id: Number.parseInt(id) },
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
                stripeSubscriptionId: true,
                stripePriceId: true,
                email: true,
                firstName: true,
                lastName: true,
                renewalType: true,
                autopayConsent: true,
                onboardingCompleted: true
            }
        });

        if (!user) {
            return res.json({ exists: false, isActive: false });
        }

        // Fetch duration from the latest successful payment
        const latestPayment = await prisma.payment.findFirst({
            where: { userId: user.id, status: 'paid' },
            orderBy: { createdAt: 'desc' },
            select: { duration: true }
        });

        // --- Authoritative next billing date: Return from User model directly as requested ---
        console.log("DB nextBillingDate:", user.nextBillingDate);

        // Logic to determine if expired for frontend use
        let currentStatus = user.subscriptionStatus;
        if (currentStatus === 'trial' && user.trialEndDate && new Date(user.trialEndDate) < new Date()) {
            currentStatus = 'expired';
        }

        res.json({
            exists: true,
            isActive: user.isActive,
            subscriptionStatus: currentStatus,
            trialEndDate: user.trialEndDate,
            trialStartDate: user.trialStartDate,
            subscriptionPlan: user.subscriptionPlan,
            planStartDate: user.planStartDate,
            planExpiryDate: user.planExpiryDate,
            nextBillingDate: user.nextBillingDate, // Read directly from User table
            stripePriceId: user.stripePriceId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            renewalType: user.renewalType,
            onboardingCompleted: user.onboardingCompleted,
            duration: latestPayment?.duration || null
        });
    } catch (error) {
        console.error('Failed to fetch user status:', error);
        res.status(500).json({ error: 'Failed to fetch user status' });
    }
});

app.post('/users', async (req, res) => {
    const { firstName, lastName, email, mobile, role, customRoleName, password, creatorId, sendWelcomeEmail } = req.body;
    try {
        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                mobile,
                role,
                customRoleName,
                isActive: req.body.isActive !== undefined ? req.body.isActive : true,
                password: await bcrypt.hash(password, 10),
                creatorId: creatorId ? Number.parseInt(creatorId) : null
            }
        });

        // Send welcome email if requested — fire and forget, don't block the response
        if (sendWelcomeEmail) {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject: 'Welcome to iAudit Global!',
                html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                            <h2 style="color: #213847;">Welcome to iAudit Global, ${firstName} ${lastName}!</h2>
                            <p style="color: #4B5563;">Your account has been created successfully. Here are your login details:</p>
                            <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin: 20px 0;">
                                <p style="margin: 0; color: #111827;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                                <p style="margin: 8px 0 0; color: #111827;"><strong>Email:</strong> ${email}</p>
                                <p style="margin: 8px 0 0; color: #111827;"><strong>Password:</strong> ${password}</p>
                            </div>
                            <p style="color: #4B5563;">You can log in to iAudit Global using your email address and password above.</p>
                            <p style="color: #4B5563;">If you have any questions, please contact your administrator.</p>
                            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
                            <p style="color: #9CA3AF; font-size: 12px;">This is an automated message from iAudit Global. Please do not reply to this email.</p>
                        </div>
                    `
            };
            // Non-blocking: email sends in background, user creation returns immediately
            transporter.sendMail(mailOptions)
                .then(() => console.log(`Welcome email sent to ${email}`))
                .catch((emailError) => console.error('Failed to send welcome email:', emailError));
        }

        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});


app.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, mobile, role, customRoleName, isActive, password, onboardingCompleted } = req.body;
    try {
        const updateData = {
            firstName,
            lastName,
            email,
            mobile,
            role,
            customRoleName,
            isActive,
            onboardingCompleted: onboardingCompleted !== undefined ? onboardingCompleted : undefined
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: Number.parseInt(id) },
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

app.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({
            where: { id: Number.parseInt(id) }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Audit Program routes
app.post('/users/:id/start-trial', async (req, res) => {
    const { id } = req.params;
    try {
        const trialStartDate = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialStartDate.getDate() + 14);

        const user = await prisma.user.update({
            where: { id: Number.parseInt(id) },
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
app.get('/audit-programs', checkTrialExpiration, async (req, res) => {
    const { userId, full } = req.query;

    // SECURITY: Enforce strict userId filtering. Do not return all programs if userId is missing.
    if (!userId || userId === 'undefined' || userId === 'null') {
        return res.json([]);
    }

    try {
        const parsedUserId = Number.parseInt(userId);
        console.log(`[DEBUG] Fetching audit programs for parsedUserId: ${parsedUserId}`);
        if (Number.isNaN(parsedUserId)) {
            console.warn(`[DEBUG] parsedUserId is NaN for userId: ${userId}`);
            return res.json([]);
        }

        const programs = await prisma.auditProgram.findMany({
            where: {
                OR: [
                    { userId: parsedUserId },
                    { leadAuditorId: parsedUserId },
                    { auditors: { some: { id: parsedUserId } } }
                ]
            },
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
        console.log(`[DEBUG] Found ${programs.length} programs for user ${parsedUserId}`);
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
app.get('/audit-programs/:id', checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    try {
        const program = await prisma.auditProgram.findUnique({
            where: { id: Number.parseInt(id) },
            include: {
                site: true,
                auditors: true,
                leadAuditor: true
            }
        });
        if (!program) return res.status(404).json({ error: 'Audit program not found' });
        res.json(program);
    } catch (error) {
        console.error('Failed to fetch audit program details:', error);
        res.status(500).json({ error: 'Failed to fetch audit program details' });
    }
});

app.post('/audit-programs', checkTrialExpiration, async (req, res) => {
    const { name, isoStandard, frequency, duration, siteId, auditorIds, leadAuditorId, scheduleData, userId } = req.body;
    try {
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
                userId: userId ? Number.parseInt(userId) : null
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

app.put('/audit-programs/:id', checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const { name, isoStandard, frequency, duration, siteId, auditorIds, leadAuditorId, scheduleData, status } = req.body;
    try {
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

app.delete('/audit-programs/:id', checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const programId = Number.parseInt(id);
    try {
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
app.get('/audit-plans', checkTrialExpiration, async (req, res) => {
    const { programId, userId } = req.query;
    try {
        const whereClause = {};
        if (programId) whereClause.auditProgramId = Number.parseInt(programId);
        if (userId) {
            const uId = Number.parseInt(userId);
            whereClause.OR = [
                { userId: uId },
                { leadAuditorId: uId },
                { auditors: { some: { id: uId } } }
            ];
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
                // We fetch auditData only to calculate progress on server
                auditData: true,
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
            if (plan.auditData) {
                const data = typeof plan.auditData === 'string' ? JSON.parse(plan.auditData) : plan.auditData;
                progress = data.progress ?? 0;
            }

            const includeData = req.query.includeData === 'true';

            // Remove full auditData from the list response UNLESS includeData=true is passed
            if (!includeData) {
                const { auditData: _, ...planWithoutData } = plan;
                return {
                    ...planWithoutData,
                    progress
                };
            }

            return {
                ...plan,
                progress
            };
        });

        res.json(optimizedPlans);
    } catch (error) {
        console.error('Failed to fetch audit plans:', error);
        res.status(500).json({ error: 'Failed to fetch audit plans' });
    }
});

// Get single Audit Plan (Full Details)
app.get('/audit-plans/:id', checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    try {
        const plan = await prisma.auditPlan.findUnique({
            where: { id: Number.parseInt(id) },
            include: {
                leadAuditor: true,
                auditors: true,
                auditProgram: {
                    include: {
                        site: true
                    }
                }
            }
        });
        if (!plan) return res.status(404).json({ error: 'Audit plan not found' });
        res.json(plan);
    } catch (error) {
        console.error('Failed to fetch audit plan details:', error);
        res.status(500).json({ error: 'Failed to fetch audit plan details' });
    }
});

// Create Audit Plan
app.post('/audit-plans', checkTrialExpiration, async (req, res) => {
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
                userId: userId ? Number.parseInt(userId) : null
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
app.put('/audit-plans/:id', checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    const {
        auditType, auditName, templateId, date, location,
        scope, objective, criteria,
        leadAuditorId, auditorIds, itinerary
    } = req.body;

    try {
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
        if (req.body.auditData !== undefined) updateData.auditData = req.body.auditData;
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

// Delete Audit Plan
app.delete('/audit-plans/:id', checkTrialExpiration, async (req, res) => {
    const { id } = req.params;
    try {
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
app.post('/send-assessment-report', async (req, res) => {
    const { to, companyName, auditorName, auditCompany, standard, score, date, questions } = req.body;

    if (!to || !companyName || !standard) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const total = questions?.length || 0;
        const yesCount = questions?.filter(q => q.answer === 'yes').length || 0;
        const noCount = questions?.filter(q => q.answer === 'no').length || 0;
        const percentage = total > 0 ? Math.round((yesCount / total) * 100) : 0;

        // Group questions by clause for detailed breakdown
        const clauseGroups = {};
        (questions || []).forEach(q => {
            if (!clauseGroups[q.clause]) clauseGroups[q.clause] = { yes: 0, no: 0, total: 0 };
            clauseGroups[q.clause].total++;
            if (q.answer === 'yes') clauseGroups[q.clause].yes++;
            else clauseGroups[q.clause].no++;
        });

        const clauseRows = Object.entries(clauseGroups).map(([clause, data]) => {
            const pct = Math.round((data.yes / data.total) * 100);
            const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626';
            return `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${clause}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px;">${data.yes} / ${data.total}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">
                    <span style="color:${color};font-weight:600;font-size:13px;">${pct}%</span>
                </td>
            </tr>`;
        }).join('');

        const scoreColor = percentage >= 70 ? '#16a34a' : percentage >= 40 ? '#d97706' : '#dc2626';
        const stage = score >= 38 ? 'Mature Stage' : score >= 25 ? 'Moderate Stage' : 'Early Stage';

        const mailOptions = {
            from: 'subs.safetynett@gmail.com',
            to,
            subject: `Your ${standard} Self Assessment Report — ${companyName}`,
            html: `
            <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#f8fafc;">
                <!-- Header -->
                <div style="background:#213847;padding:28px 32px;border-radius:8px 8px 0 0;">
                    <h1 style="margin:0;color:#fff;font-size:22px;">Self Assessment Report</h1>
                    <p style="margin:6px 0 0;color:#94a3b8;font-size:14px;">${standard}</p>
                </div>

                <!-- Details -->
                <div style="background:#fff;padding:28px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
                    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:160px;">Company</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${companyName}</td></tr>
                        ${auditCompany ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Company Being Audited</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${auditCompany}</td></tr>` : ''}
                        <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Auditor</td><td style="padding:6px 0;font-size:13px;">${auditorName || '-'}</td></tr>
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

        // Fire and forget so response is returned immediately
        transporter.sendMail(mailOptions)
            .then(() => console.log(`Assessment report sent to ${to}`))
            .catch(err => console.error('Failed to send assessment report email:', err));

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
        const mailOptions = {
            from: process.env.SMTP_USER || 'noreply@iaudit.global',
            to: 'Mathew@iaudit.global',
            cc: 'jasmin@iaudit.global',
            subject: `[Feedback] From ${name}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background: #213847; padding: 20px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0;">New User Feedback</h2>
                    </div>
                    <div style="padding: 24px;">
                        <p style="margin-bottom: 20px; font-size: 16px; color: #475569;">You have received a new feedback submission from a user.</p>
                        
                        <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
                            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase;">Name</p>
                            <p style="margin: 0 0 16px; font-weight: 600; color: #1e293b;">${name}</p>
                            
                            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase;">Email</p>
                            <p style="margin: 0 0 16px; font-weight: 600; color: #1e293b;">${email}</p>
                            
                            <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; text-transform: uppercase;">Feedback</p>
                            <p style="margin: 0; color: #334155; line-height: 1.6;">${feedback}</p>
                        </div>
                        
                        ${image ? '<p style="color: #64748b; font-size: 13px;"><em>An image attachment is included below.</em></p>' : ''}
                    </div>
                    <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #94a3b8;">
                        This email was sent automatically from iAudit Global Feedback system.
                    </div>
                </div>
            `
        };

        if (image) {
            const base64Data = image.split(';base64,').pop();
            const extension = image.split(';')[0].split('/')[1] || 'png';

            mailOptions.attachments = [{
                filename: `feedback_image.${extension}`,
                content: base64Data,
                encoding: 'base64'
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

app.post('/payments/create-checkout-session', async (req, res) => {
    const { userId, planId, billingType, currency, priceId: directPriceId, duration } = req.body;

    if (!userId || !planId || !billingType || !currency) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: Number.parseInt(userId) } });
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

app.post('/payments/portal', async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: Number.parseInt(userId) } });
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
app.get('/subscription/invoices/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await prisma.user.findUnique({ where: { id: Number.parseInt(userId) } });
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
            where: { userId: Number.parseInt(userId), status: 'paid' },
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
app.patch('/users/:userId/subscription-preference', async (req, res) => {
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
app.post('/subscription/cancel-request', async (req, res) => {
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
app.post('/subscription/upgrade-request', async (req, res) => {
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
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
