-- Login lockout tracking for password sign-in (SAW-007)
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMPTZ(6);