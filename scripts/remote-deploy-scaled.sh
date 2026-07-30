#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
# Invoked two ways, both providing the same env vars:
#   1. AWS SSM Run Command, targeting all running ASG instances on every push.
#   2. A new ASG instance's own user-data script on boot (scripts/bootstrap-instance.sh),
#      fetching whatever the latest deployed release currently is.
# Either way this is the same code path — that's what makes scale-out
# "automatic": a brand-new instance ends up running exactly what every other
# instance is already running, no separate provisioning logic to maintain.
APP_DIR="/opt/refreeg"
RELEASES_DIR="${APP_DIR}/releases"
SHARED_DIR="${APP_DIR}/shared"
CURRENT_LINK="${APP_DIR}/current"
RELEASE_ID="${RELEASE_ID:?RELEASE_ID env var is required (git sha)}"
RELEASES_BUCKET="${RELEASES_BUCKET:?RELEASES_BUCKET env var is required (S3 bucket name)}"
SSM_PARAM_PATH="${SSM_PARAM_PATH:?SSM_PARAM_PATH env var is required (e.g. /refreeg/production)}"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
KEEP_RELEASES=5
MIN_FREE_DISK_KB=200000           # Require at least ~200 MB free before extracting

mkdir -p "$APP_DIR" "$RELEASES_DIR" "$SHARED_DIR/logs"

# ── 1. Disk-space guard ──────────────────────────────────────────────────────
FREE_KB=$(df --output=avail "$APP_DIR" | tail -1)
if (( FREE_KB < MIN_FREE_DISK_KB )); then
  echo "Warning: Only ${FREE_KB} KB free in ${APP_DIR}. Need ${MIN_FREE_DISK_KB} KB. Aborting."
  exit 1
fi
echo "Disk space OK (${FREE_KB} KB free)."

# ── 2. Fetch secrets from SSM Parameter Store (SecureString, KMS-encrypted) ──
# Read via the instance's own IAM role — nothing is ever transferred as a
# plaintext file. Rebuilt fresh on every deploy so rotated secrets take effect
# on the next push without any separate "update secrets" step.
echo "Fetching secrets from ${SSM_PARAM_PATH}..."
: > "${SHARED_DIR}/secrets.env"
NEXT_TOKEN=""
while : ; do
  if [[ -n "$NEXT_TOKEN" ]]; then
    PAGE=$(aws ssm get-parameters-by-path --path "$SSM_PARAM_PATH" --with-decryption --recursive --next-token "$NEXT_TOKEN" --output json)
  else
    PAGE=$(aws ssm get-parameters-by-path --path "$SSM_PARAM_PATH" --with-decryption --recursive --output json)
  fi

  echo "$PAGE" | node -e '
    const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const prefix = process.argv[1] + "/";
    for (const p of data.Parameters) {
      const key = p.Name.startsWith(prefix) ? p.Name.slice(prefix.length) : p.Name;
      const value = String(p.Value).replace(/\n/g, "\\n");
      process.stdout.write(`${key}=${value}\n`);
    }
  ' "$SSM_PARAM_PATH" >> "${SHARED_DIR}/secrets.env"

  NEXT_TOKEN=$(echo "$PAGE" | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));process.stdout.write(d.NextToken||"")')
  [[ -z "$NEXT_TOKEN" ]] && break
done

if [[ ! -s "${SHARED_DIR}/secrets.env" ]]; then
  echo "ERROR: No secrets found under ${SSM_PARAM_PATH}. Aborting."
  exit 1
fi
chmod 600 "${SHARED_DIR}/secrets.env"
# shellcheck source=/dev/null
source "${SHARED_DIR}/secrets.env"
echo "Secrets loaded ($(wc -l < "${SHARED_DIR}/secrets.env") keys)."

# ── 2b. Keep rollback.sh current on disk ──────────────────────────────────────
# The "Rollback on failure" SSM command just runs this path directly — refresh
# it on every deploy so it's always present and up to date, same reasoning as
# bootstrap-instance.sh always fetching the latest remote-deploy.sh.
aws s3 cp "s3://${RELEASES_BUCKET}/scripts/rollback.sh" "${APP_DIR}/rollback.sh"
chmod +x "${APP_DIR}/rollback.sh"

# ── 3. Fetch and extract the release tarball from S3 ─────────────────────────
# The tarball root is the Next.js standalone output (server.js, its own pruned
# node_modules, .next/, public/) plus ecosystem.config.js — self-contained.
echo "Fetching release ${RELEASE_ID} from s3://${RELEASES_BUCKET}/releases/${RELEASE_ID}.tar.gz..."
mkdir -p "$RELEASE_DIR"
aws s3 cp "s3://${RELEASES_BUCKET}/releases/${RELEASE_ID}.tar.gz" "/tmp/${RELEASE_ID}.tar.gz"
tar -xzf "/tmp/${RELEASE_ID}.tar.gz" -C "$RELEASE_DIR"
rm -f "/tmp/${RELEASE_ID}.tar.gz"
echo "Extraction complete."

# ── 4. Record the currently-live release (for rollback) before cutover ───────
if [[ -L "$CURRENT_LINK" ]]; then
  readlink -f "$CURRENT_LINK" | xargs -n1 basename > "${RELEASES_DIR}/.previous"
  echo "Previous release recorded: $(cat "${RELEASES_DIR}/.previous")"
fi

# ── 5. Atomic symlink cutover to the new release ──────────────────────────────
ln -sfn "$RELEASE_DIR" "${APP_DIR}/current_tmp"
mv -Tf "${APP_DIR}/current_tmp" "$CURRENT_LINK"
echo "current -> releases/${RELEASE_ID}"

# ── 6. Start/reload via PM2 ───────────────────────────────────────────────────
# `pm2 startOrReload` can reuse a stale process definition (e.g. an old `script`
# path) for an app name it already knows about, especially if that process was
# left in a crashed/errored state. Delete by name first so every deploy always
# registers fresh from the current ecosystem.config.js.
pm2 delete frontend api 2>/dev/null || true
pm2 start "${CURRENT_LINK}/ecosystem.config.js" --update-env

# ── 7. Persist new PM2 state (only after successful reload) ──────────────────
pm2 save --force
echo "Deployment complete. PM2 process list:"
pm2 list

# ── 8. Prune old releases, keep the last N ────────────────────────────────────
cd "$RELEASES_DIR"
ls -1t | grep -v '^\.previous$' | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf --
echo "Releases kept: $(ls -1 "$RELEASES_DIR" | grep -v '^\.previous$' | wc -l)"

# ── 9. Cap PM2 log files ──────────────────────────────────────────────────────
# PM2 appends to these forever with no rotation configured; truncate any that
# have grown past 20MB so logs can't slowly fill the disk between deploys.
find "${SHARED_DIR}/logs" -type f -name '*.log' -size +20M -exec truncate -s 0 {} \; 2>/dev/null || true
