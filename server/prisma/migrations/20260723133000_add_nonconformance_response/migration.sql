-- NonconformanceResponse append-only responses for auditee workflow.

CREATE TABLE IF NOT EXISTS "NonconformanceResponse" (
    "id" SERIAL NOT NULL,
    "nonconformanceId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "rootCause" TEXT NOT NULL,
    "immediateCorrection" TEXT,
    "correctiveAction" TEXT NOT NULL,
    "preventiveAction" TEXT,
    "proposedCompletionDate" TIMESTAMP(3),
    "additionalComments" TEXT,
    "evidenceFilenames" JSONB NOT NULL DEFAULT '[]',
    "submittedById" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonconformanceResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NonconformanceResponse_nonconformanceId_version_key"
    ON "NonconformanceResponse"("nonconformanceId", "version");
CREATE INDEX IF NOT EXISTS "NonconformanceResponse_nonconformanceId_idx"
    ON "NonconformanceResponse"("nonconformanceId");
CREATE INDEX IF NOT EXISTS "NonconformanceResponse_submittedById_idx"
    ON "NonconformanceResponse"("submittedById");
CREATE INDEX IF NOT EXISTS "NonconformanceResponse_submittedAt_idx"
    ON "NonconformanceResponse"("submittedAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NonconformanceResponse_nonconformanceId_fkey'
    ) THEN
        ALTER TABLE "NonconformanceResponse"
            ADD CONSTRAINT "NonconformanceResponse_nonconformanceId_fkey"
            FOREIGN KEY ("nonconformanceId") REFERENCES "Nonconformance"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NonconformanceResponse_submittedById_fkey'
    ) THEN
        ALTER TABLE "NonconformanceResponse"
            ADD CONSTRAINT "NonconformanceResponse_submittedById_fkey"
            FOREIGN KEY ("submittedById") REFERENCES "User"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
