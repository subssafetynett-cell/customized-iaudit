-- Denormalized finding emails for inbox lookups (avoids auditData::text LIKE scans → 504s).
ALTER TABLE "AuditPlan" ADD COLUMN IF NOT EXISTS "assigneeEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AuditPlan" ADD COLUMN IF NOT EXISTS "raisedByEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "AuditPlan_assigneeEmails_gin" ON "AuditPlan" USING GIN ("assigneeEmails");
CREATE INDEX IF NOT EXISTS "AuditPlan_raisedByEmails_gin" ON "AuditPlan" USING GIN ("raisedByEmails");
