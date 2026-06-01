-- Existing accounts are treated as already verified.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

UPDATE "User" SET "emailVerifiedAt" = COALESCE("firstLoginAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "emailVerifiedAt" IS NULL;
