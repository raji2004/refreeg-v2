#!/bin/bash
# scripts/sync-db.sh
# Syncs data from Supabase (Source) to EC2 Postgres (Target)

# Load .env variables
export $(grep -v '^#' .env | xargs)

# Source DB (Supabase)
SOURCE_DB="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Target DB (Local EC2 Postgres)
# Extracting local DB from your DATABASE_URL in .env
TARGET_DB=$DATABASE_URL

echo "⏳ Starting Database Sync (Supabase -> EC2)..."

# 1. Dump data from Supabase (Data only, skip schema since Prisma handles that)
echo "📥 Dumping data from Supabase..."
pg_dump --clean --if-exists --data-only --no-owner --no-privileges "$SOURCE_DB" > supabase_data_dump.sql

# 2. Restore to EC2
echo "📤 Restoring data to EC2..."
psql "$TARGET_DB" < supabase_data_dump.sql

# 3. Clean up
rm supabase_data_dump.sql

echo "✅ Database Sync Complete!"
