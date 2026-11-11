-- Single statement: CONCURRENTLY cannot run inside a transaction block.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_profiles_created_at" ON "public"."profiles"("created_at");
