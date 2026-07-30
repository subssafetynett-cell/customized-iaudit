-- Speed ORDER BY "updatedAt" on findings inbox plan scans
CREATE INDEX IF NOT EXISTS "AuditPlan_updatedAt_idx" ON "AuditPlan"("updatedAt");
