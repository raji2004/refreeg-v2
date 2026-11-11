-- Single statement: CONCURRENTLY cannot run inside a transaction block.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_referrals_v1_created_at" ON "public"."referrals_v1"("created_at_v1");
