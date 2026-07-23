-- Auditor review + activity history for Nonconformance workflow.

ALTER TABLE "Nonconformance" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "NonconformanceReview" (
    "id" SERIAL NOT NULL,
    "nonconformanceId" INTEGER NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "reviewedById" INTEGER NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonconformanceReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NonconformanceReview_nonconformanceId_idx"
    ON "NonconformanceReview"("nonconformanceId");
CREATE INDEX IF NOT EXISTS "NonconformanceReview_reviewedById_idx"
    ON "NonconformanceReview"("reviewedById");
CREATE INDEX IF NOT EXISTS "NonconformanceReview_reviewedAt_idx"
    ON "NonconformanceReview"("reviewedAt");

CREATE TABLE IF NOT EXISTS "NonconformanceActivity" (
    "id" SERIAL NOT NULL,
    "nonconformanceId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "comment" TEXT,
    "actorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonconformanceActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NonconformanceActivity_nonconformanceId_idx"
    ON "NonconformanceActivity"("nonconformanceId");
CREATE INDEX IF NOT EXISTS "NonconformanceActivity_actorId_idx"
    ON "NonconformanceActivity"("actorId");
CREATE INDEX IF NOT EXISTS "NonconformanceActivity_createdAt_idx"
    ON "NonconformanceActivity"("createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NonconformanceReview_nonconformanceId_fkey'
    ) THEN
        ALTER TABLE "NonconformanceReview"
            ADD CONSTRAINT "NonconformanceReview_nonconformanceId_fkey"
            FOREIGN KEY ("nonconformanceId") REFERENCES "Nonconformance"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NonconformanceReview_reviewedById_fkey'
    ) THEN
        ALTER TABLE "NonconformanceReview"
            ADD CONSTRAINT "NonconformanceReview_reviewedById_fkey"
            FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NonconformanceActivity_nonconformanceId_fkey'
    ) THEN
        ALTER TABLE "NonconformanceActivity"
            ADD CONSTRAINT "NonconformanceActivity_nonconformanceId_fkey"
            FOREIGN KEY ("nonconformanceId") REFERENCES "Nonconformance"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NonconformanceActivity_actorId_fkey'
    ) THEN
        ALTER TABLE "NonconformanceActivity"
            ADD CONSTRAINT "NonconformanceActivity_actorId_fkey"
            FOREIGN KEY ("actorId") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
