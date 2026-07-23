-- Nonconformance module foundation (linked to AuditPlan + findingId in audit JSON).

CREATE TABLE IF NOT EXISTS "Nonconformance" (
    "id" SERIAL NOT NULL,
    "ncNumber" TEXT NOT NULL,
    "auditPlanId" INTEGER NOT NULL,
    "findingId" TEXT NOT NULL,
    "findingTitle" TEXT NOT NULL,
    "findingDescription" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "assigneeId" INTEGER NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nonconformance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Nonconformance_ncNumber_key" ON "Nonconformance"("ncNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Nonconformance_auditPlanId_findingId_key" ON "Nonconformance"("auditPlanId", "findingId");
CREATE INDEX IF NOT EXISTS "Nonconformance_auditPlanId_idx" ON "Nonconformance"("auditPlanId");
CREATE INDEX IF NOT EXISTS "Nonconformance_assigneeId_idx" ON "Nonconformance"("assigneeId");
CREATE INDEX IF NOT EXISTS "Nonconformance_reviewerId_idx" ON "Nonconformance"("reviewerId");
CREATE INDEX IF NOT EXISTS "Nonconformance_status_idx" ON "Nonconformance"("status");
CREATE INDEX IF NOT EXISTS "Nonconformance_createdById_idx" ON "Nonconformance"("createdById");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Nonconformance_auditPlanId_fkey'
    ) THEN
        ALTER TABLE "Nonconformance"
            ADD CONSTRAINT "Nonconformance_auditPlanId_fkey"
            FOREIGN KEY ("auditPlanId") REFERENCES "AuditPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Nonconformance_assigneeId_fkey'
    ) THEN
        ALTER TABLE "Nonconformance"
            ADD CONSTRAINT "Nonconformance_assigneeId_fkey"
            FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Nonconformance_reviewerId_fkey'
    ) THEN
        ALTER TABLE "Nonconformance"
            ADD CONSTRAINT "Nonconformance_reviewerId_fkey"
            FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Nonconformance_createdById_fkey'
    ) THEN
        ALTER TABLE "Nonconformance"
            ADD CONSTRAINT "Nonconformance_createdById_fkey"
            FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
