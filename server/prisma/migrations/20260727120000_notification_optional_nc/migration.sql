-- Allow finding-assignment notifications without a formal Nonconformance.

ALTER TABLE "Notification" ALTER COLUMN "nonconformanceId" DROP NOT NULL;
