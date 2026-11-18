-- Single statement: CONCURRENTLY cannot run inside a transaction block.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_pledges_created_at" ON "public"."pledges"("created_at");
