#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
APP_DIR="/mnt/data/refreeg"
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
# The tarball root is the Next.js standalone output (server.js, its own pruned
# node_modules, .next/, public/) plus ecosystem.config.js — self-contained,
# nothing else needs to be copied in separately.
echo "Extracting release ${RELEASE_ID}..."
mkdir -p "$RELEASE_DIR"
tar -xzf "${APP_DIR}/${TARBALL}" -C "$RELEASE_DIR"
rm -f "${APP_DIR}/${TARBALL}"   # free space immediately
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
# Postgres runs on this same EC2 instance (small, RAM-constrained — see
# ecosystem.config.js). This used to run two separate PM2 processes
# ("frontend" on :3000, "api" on :4000, one per hostname) — each held its own
# Prisma connection pool, and the old `pm2 delete frontend api` + `pm2 start`
# here fully deregistered both before respawning them from scratch, leaving
# a real window with neither process running, right on top of the tar
# extraction/prune I/O this script also does. That's enough contention on a
# small box to make Postgres briefly slow to accept connections (intermittent
# PrismaClientKnownRequestError/PrismaClientInitializationError in prod) at
# the same moment old static chunks vanish for anyone with the site already
# open (their next chunk fetch 404s once the old process — and its release
# directory — is gone).
#
# ecosystem.config.js now defines one "refreeg" process serving both
# hostnames (nginx proxies both to the same port; middleware.ts's domain
# split is a browser-facing redirect, not a backend route) — halves both the
# connection-pool count and the restart contention. The one-time delete below
# only matters for the first deploy after this change, to clear out the old
# "frontend"/"api" names (and free port 3000) before the new "refreeg"
# process tries to bind it; harmless no-op on every deploy after that.
pm2 delete frontend api 2>/dev/null || true

# `pm2 reload <config>` re-reads ecosystem.config.js (so an updated script
# path/args/env still takes effect) but reloads an already-registered process
# instead of fully deregistering and re-registering from scratch —
# meaningfully less downtime than delete+start. Note this is NOT true
# zero-downtime: that requires cluster mode (multiple instances so a new one
# can come up before the old one stops), which is deliberately not used here
# for RAM reasons. Falls back to `pm2 start` on a fresh box, or right after
# the one-time "frontend"/"api" cleanup above.
if pm2 describe refreeg > /dev/null 2>&1; then
  pm2 reload "${CURRENT_LINK}/ecosystem.config.js" --update-env
else
  echo "No existing refreeg process found — starting fresh."
  pm2 start "${CURRENT_LINK}/ecosystem.config.js" --update-env
fi

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
