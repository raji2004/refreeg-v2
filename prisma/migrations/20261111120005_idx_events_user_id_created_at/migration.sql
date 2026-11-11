-- Single statement: CONCURRENTLY cannot run inside a transaction block.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_events_user_id_created_at" ON "public"."events"("user_id", "created_at");
