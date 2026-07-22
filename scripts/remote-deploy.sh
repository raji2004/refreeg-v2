#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
APP_DIR="/home/ec2-user/refreeg"
RELEASES_DIR="${APP_DIR}/releases"
SHARED_DIR="${APP_DIR}/shared"
CURRENT_LINK="${APP_DIR}/current"
RELEASE_ID="${RELEASE_ID:?RELEASE_ID env var is required (git sha)}"
TARBALL="${TARBALL:?TARBALL env var is required}"
RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
KEEP_RELEASES=5
MIN_FREE_DISK_KB=200000           # Require at least ~200 MB free before extracting

# ── 1. Disk-space guard ──────────────────────────────────────────────────────
FREE_KB=$(df --output=avail "$APP_DIR" | tail -1)
if (( FREE_KB < MIN_FREE_DISK_KB )); then
  echo "Warning: Only ${FREE_KB} KB free in ${APP_DIR}. Need ${MIN_FREE_DISK_KB} KB. Aborting."
  exit 1
fi
echo "Disk space OK (${FREE_KB} KB free)."

# ── 2. Load environment variables from secrets.env (shared across releases) ──
mkdir -p "$SHARED_DIR/logs"
if [[ -f "${APP_DIR}/secrets.env" ]]; then
  mv "${APP_DIR}/secrets.env" "${SHARED_DIR}/secrets.env"
fi
if [[ ! -f "${SHARED_DIR}/secrets.env" ]]; then
  echo "ERROR: secrets.env not found at ${SHARED_DIR}/secrets.env. Aborting."
  exit 1
fi
chmod 600 "${SHARED_DIR}/secrets.env"
# Strip leading whitespace (heredoc indent) then source
sed 's/^[[:space:]]*//' "${SHARED_DIR}/secrets.env" > /tmp/refreeg-secrets.env
# shellcheck source=/dev/null
source /tmp/refreeg-secrets.env
rm -f /tmp/refreeg-secrets.env
echo "Secrets loaded."

# ── 3. Extract new release into its own versioned directory ──────────────────
echo "Extracting release ${RELEASE_ID}..."
mkdir -p "$RELEASE_DIR"
tar -xzf "${APP_DIR}/${TARBALL}" -C "$RELEASE_DIR"
rm -f "${APP_DIR}/${TARBALL}"   # free space immediately

# ecosystem.config.js is transferred alongside the tarball; make sure the
# release has its own copy so it's self-contained.
if [[ -f "${APP_DIR}/ecosystem.config.js" ]]; then
  cp "${APP_DIR}/ecosystem.config.js" "${RELEASE_DIR}/ecosystem.config.js"
fi
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
pm2 startOrReload "${CURRENT_LINK}/ecosystem.config.js" --update-env

# ── 7. Persist new PM2 state (only after successful reload) ──────────────────
pm2 save --force
echo "Deployment complete. PM2 process list:"
pm2 list

# ── 8. Prune old releases, keep the last N ────────────────────────────────────
cd "$RELEASES_DIR"
ls -1t | grep -v '^\.previous$' | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf --
echo "Releases kept: $(ls -1 "$RELEASES_DIR" | grep -v '^\.previous$' | wc -l)"
