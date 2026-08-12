-- AlterTable
-- Backfills the payment_provider column that schema/cause.prisma has
-- expected since the multi-currency/Flutterwave work, but which was never
-- captured in a migration — the schema was edited without regenerating one,
-- so prisma.donation.findMany() started failing in production with
-- "The column `donations.payment_provider` does not exist" (P2022).
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "payment_provider" VARCHAR DEFAULT 'paystack';
