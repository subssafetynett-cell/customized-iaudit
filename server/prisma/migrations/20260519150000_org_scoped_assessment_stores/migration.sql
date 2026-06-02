-- Organization-scoped assessment stores (replace per-user isolation)

CREATE TABLE "OrgGapAnalysisStore" (
    "orgRootUserId" INTEGER NOT NULL,
    "analyses" JSONB NOT NULL DEFAULT '[]',
    "draft" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" INTEGER,
    CONSTRAINT "OrgGapAnalysisStore_pkey" PRIMARY KEY ("orgRootUserId")
);

CREATE TABLE "OrgSelfAssessmentStore" (
    "orgRootUserId" INTEGER NOT NULL,
    "assessments" JSONB NOT NULL DEFAULT '[]',
    "draft" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" INTEGER,
    CONSTRAINT "OrgSelfAssessmentStore_pkey" PRIMARY KEY ("orgRootUserId")
);

ALTER TABLE "OrgGapAnalysisStore" ADD CONSTRAINT "OrgGapAnalysisStore_orgRootUserId_fkey" FOREIGN KEY ("orgRootUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgSelfAssessmentStore" ADD CONSTRAINT "OrgSelfAssessmentStore_orgRootUserId_fkey" FOREIGN KEY ("orgRootUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Legacy per-user tables are migrated to org scope in application code, then dropped.
