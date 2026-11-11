-- Single statement: CONCURRENTLY cannot run inside a transaction block.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_donations_status_created_at" ON "public"."donations"("status", "created_at");
