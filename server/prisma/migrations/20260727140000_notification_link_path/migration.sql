-- Optional deep-link path for finding / NC notifications (e.g. /audit-findings/12/checklist-1-2).

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "linkPath" TEXT;
