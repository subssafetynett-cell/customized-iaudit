-- Audit lifecycle status driven by checklist answer progress
ALTER TABLE "AuditPlan" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PLANNED';

CREATE INDEX IF NOT EXISTS "AuditPlan_status_idx" ON "AuditPlan"("status");

-- Backfill from existing auditData.progress
UPDATE "AuditPlan"
SET "status" = CASE
  WHEN "auditData" IS NULL THEN 'PLANNED'
  WHEN COALESCE(("auditData"->>'progress')::double precision, 0) >= 100 THEN 'COMPLETED'
  WHEN COALESCE(("auditData"->>'progress')::double precision, 0) > 0 THEN 'IN_PROGRESS'
  ELSE 'PLANNED'
END;
