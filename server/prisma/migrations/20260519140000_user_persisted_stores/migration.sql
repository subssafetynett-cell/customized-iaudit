-- CreateTable
CREATE TABLE "UserGapAnalysisStore" (
    "userId" INTEGER NOT NULL,
    "analyses" JSONB NOT NULL DEFAULT '[]',
    "draft" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGapAnalysisStore_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserSelfAssessmentStore" (
    "userId" INTEGER NOT NULL,
    "assessments" JSONB NOT NULL DEFAULT '[]',
    "draft" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSelfAssessmentStore_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserGapAnalysisStore" ADD CONSTRAINT "UserGapAnalysisStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSelfAssessmentStore" ADD CONSTRAINT "UserSelfAssessmentStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
