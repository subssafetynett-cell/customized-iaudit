-- In-app notifications for Nonconformance workflow.

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" SERIAL NOT NULL,
    "recipientUserId" INTEGER NOT NULL,
    "nonconformanceId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_recipientUserId_createdAt_idx"
    ON "Notification"("recipientUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_recipientUserId_isRead_idx"
    ON "Notification"("recipientUserId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_nonconformanceId_idx"
    ON "Notification"("nonconformanceId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Notification_recipientUserId_fkey'
    ) THEN
        ALTER TABLE "Notification"
            ADD CONSTRAINT "Notification_recipientUserId_fkey"
            FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Notification_nonconformanceId_fkey'
    ) THEN
        ALTER TABLE "Notification"
            ADD CONSTRAINT "Notification_nonconformanceId_fkey"
            FOREIGN KEY ("nonconformanceId") REFERENCES "Nonconformance"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
