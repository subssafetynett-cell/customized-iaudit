-- Indexes for frequently filtered / joined list columns
CREATE INDEX IF NOT EXISTS "Department_siteId_idx" ON "Department"("siteId");
CREATE INDEX IF NOT EXISTS "User_creatorId_idx" ON "User"("creatorId");
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditProgram_leadAuditorId_idx" ON "AuditProgram"("leadAuditorId");
CREATE INDEX IF NOT EXISTS "AuditProgram_createdAt_idx" ON "AuditProgram"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditProgram_status_idx" ON "AuditProgram"("status");
CREATE INDEX IF NOT EXISTS "AuditPlan_leadAuditorId_idx" ON "AuditPlan"("leadAuditorId");
CREATE INDEX IF NOT EXISTS "AuditPlan_createdAt_idx" ON "AuditPlan"("createdAt");
