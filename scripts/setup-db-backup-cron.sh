#!/bin/bash
# scripts/setup-db-backup-cron.sh
#
# One-time setup, run once on the DB host (not on every deploy):
#   1. Sets a 30-day expiry lifecycle rule on the db-backups/ S3 prefix, so
#      retention is enforced by S3 itself rather than by backup-db.sh.
#   2. Installs a daily cron job that runs scripts/backup-db.sh.
#
# Requires AWS_S3_BUCKET and DATABASE_URL to already be in the environment
# (they're loaded from secrets.env / .env on this box), and scripts/backup-db.sh
# to already be present alongside this script.

set -euo pipefail

if [ -z "${AWS_S3_BUCKET:-}" ]; then
  echo "AWS_S3_BUCKET is not set in the environment — aborting." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Setting a 30-day expiry lifecycle rule on s3://${AWS_S3_BUCKET}/db-backups/ ..."
aws s3api put-bucket-lifecycle-configuration \
  --bucket "${AWS_S3_BUCKET}" \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "expire-db-backups-after-30-days",
        "Filter": { "Prefix": "db-backups/" },
        "Status": "Enabled",
        "Expiration": { "Days": 30 }
      }
    ]
  }'

echo "Installing daily cron job (03:30 UTC) ..."
CRON_LINE="30 3 * * * DATABASE_URL='${DATABASE_URL}' AWS_S3_BUCKET='${AWS_S3_BUCKET}' bash ${SCRIPT_DIR}/backup-db.sh >> /var/log/refreeg-db-backup.log 2>&1"
( crontab -l 2>/dev/null | grep -v backup-db.sh; echo "${CRON_LINE}" ) | crontab -

echo "Done. Running one backup right now to confirm it works end-to-end ..."
DATABASE_URL="${DATABASE_URL}" AWS_S3_BUCKET="${AWS_S3_BUCKET}" bash "${SCRIPT_DIR}/backup-db.sh"

echo "Setup complete. Backups will run daily at 03:30 UTC, logged to /var/log/refreeg-db-backup.log, expiring after 30 days."
