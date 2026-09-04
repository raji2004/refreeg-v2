#!/bin/bash
# scripts/backup-db.sh
#
# Dumps the production Postgres database (custom format, restorable via
# pg_restore) and uploads it to S3. Meant to run on a schedule via cron on
# the DB host itself, where DATABASE_URL, AWS_S3_BUCKET, and AWS credentials
# (via the instance's IAM role) are already available.
#
# Runs pg_dump *inside* the refreeg_prod_db container rather than requiring
# postgresql-client on the host — Postgres only exists inside that container.
#
# Retention is handled by an S3 lifecycle rule on the db-backups/ prefix
# (set up once, see scripts/setup-db-backup-cron.sh), not by this script —
# so a failed prune here can never silently leave zero backups.

set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-refreeg_prod_db}"
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
BACKUP_FILE="/tmp/refreeg-db-backup-${TIMESTAMP}.dump"
S3_KEY="db-backups/refreeg-db-backup-${TIMESTAMP}.dump"

echo "[$(date -u)] Starting backup -> ${BACKUP_FILE}"
# Strip Prisma-only query params (e.g. ?schema=public) — plain pg_dump/libpq
# doesn't understand them and errors on "invalid URI query parameter".
PG_DUMP_URL="${DATABASE_URL%%\?*}"
docker exec "${DB_CONTAINER}" pg_dump --format=custom --no-owner --no-privileges "${PG_DUMP_URL}" > "${BACKUP_FILE}"

echo "[$(date -u)] Uploading to s3://${AWS_S3_BUCKET}/${S3_KEY}"
aws s3 cp "${BACKUP_FILE}" "s3://${AWS_S3_BUCKET}/${S3_KEY}"

rm -f "${BACKUP_FILE}"
echo "[$(date -u)] Backup complete: s3://${AWS_S3_BUCKET}/${S3_KEY}"
