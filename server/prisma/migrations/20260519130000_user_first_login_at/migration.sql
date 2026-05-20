-- AlterTable
ALTER TABLE "User" ADD COLUMN "firstLoginAt" TIMESTAMP(3);

-- Backfill: users who already logged in before this column existed
UPDATE "User" SET "firstLoginAt" = "lastLoginAt" WHERE "firstLoginAt" IS NULL AND "lastLoginAt" IS NOT NULL;
