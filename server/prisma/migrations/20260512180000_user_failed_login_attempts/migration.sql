-- Brute-force protection: lock login after consecutive wrong passwords until password reset.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
