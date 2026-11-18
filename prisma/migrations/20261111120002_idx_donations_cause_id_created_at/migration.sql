-- Single statement: CONCURRENTLY cannot run inside a transaction block.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_donations_cause_id_created_at" ON "public"."donations"("cause_id", "created_at");
