import { Router } from 'express';
import prisma from '../prisma.js';
import {
    sanitizePersonName,
    sanitizePlainText,
    escapeHtml
} from '../textSanitize.js';
import {
    actorCanViewUserBillingStatus
} from '../orgAccess.js';
import { STRIPE_CONFIG } from '../stripe-config.js';

export function createBillingRouter({ authenticateToken, checkTrialExpiration, stripe, transporter }) {
    const router = Router();

    router.post('/feedback', async (req, res) => {
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

    router.get('/stripe/session/:sessionId', async (req, res) => {
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

    router.post('/payments/create-checkout-session', authenticateToken, async (req, res) => {
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

    router.post('/payments/portal', authenticateToken, async (req, res) => {
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
    router.get('/subscription/invoices/:userId', authenticateToken, async (req, res) => {
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
                
                console.log(`[Stripe Invoice Debug] ID: ${inv.id} | Receipt: ${receipt_url ? 'FOUND' : 'MISSING'}`);

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

            // Cap Stripe fan-out — unbounded Promise.all of paymentIntents.retrieve causes 504s.
            const MAX_PI_LOOKUPS = 5;
            const toEnrich = missingPayments.slice(0, MAX_PI_LOOKUPS);
            const fallbackPaymentData = await Promise.all(toEnrich.map(async (payment) => {
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

            // Remaining local payments without extra Stripe round-trips
            const restLocal = missingPayments.slice(MAX_PI_LOOKUPS).map((payment) => ({
                id: payment.stripePaymentIntentId || `local_${payment.id}`,
                date: payment.createdAt.toISOString(),
                amount: payment.amount.toFixed(2),
                currency: payment.currency.toUpperCase(),
                status: 'PAID',
                invoice_pdf: null,
                hosted_invoice_url: null,
                receipt_url: null,
                number: payment.billingType?.toUpperCase() === 'MONTHLY' ? 'Subscription' : 'One-time Payment',
                source: 'local'
            }));

            // Combine and sort by date descending
            const combinedData = [...stripeInvoiceData, ...fallbackPaymentData, ...restLocal].sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            res.json(combinedData);
        } catch (error) {
            console.error('Invoices Fetch Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // --- Update Renewal Preference ---
    router.patch('/users/:userId/subscription-preference', authenticateToken, async (req, res) => {
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
    router.post('/subscription/cancel-request', authenticateToken, async (req, res) => {
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
    router.post('/subscription/upgrade-request', authenticateToken, async (req, res) => {
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


    return router;
}
