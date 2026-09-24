-- AlterTable
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "display_name" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "donation_preference" TEXT DEFAULT 'named';
