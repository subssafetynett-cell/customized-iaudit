-- Sync User billing/trial/onboarding columns and payment tables that were added to
-- schema.prisma but never shipped in earlier migrations (breaks prisma.user queries in prod).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialStartDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialEndDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planStartDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planExpiryDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nextBillingDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeInvoiceId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "renewalType" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "autopayConsent" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "sub_renewal_date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeInvoiceId" TEXT,
    "stripeSessionId" TEXT,
    "billingType" TEXT NOT NULL,
    "duration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripeInvoiceId_key" ON "Payment"("stripeInvoiceId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
