-- Add attempt counter to EmailOtp for brute-force protection.
-- When attemptCount reaches the limit, further verify attempts are rejected.
ALTER TABLE "EmailOtp" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;
