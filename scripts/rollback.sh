#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/refreeg"
RELEASES_DIR="${APP_DIR}/releases"
CURRENT_LINK="${APP_DIR}/current"

echo "=== Rolling back to previous release ==="

PREVIOUS_ID=""
if [[ -f "${RELEASES_DIR}/.previous" ]]; then
  PREVIOUS_ID="$(cat "${RELEASES_DIR}/.previous")"
fi

if [[ -z "$PREVIOUS_ID" || ! -d "${RELEASES_DIR}/${PREVIOUS_ID}" ]]; then
  echo "No recorded previous release, falling back to second-newest release directory..."
  CURRENT_TARGET="$(readlink -f "$CURRENT_LINK" 2>/dev/null | xargs -r basename || true)"
  PREVIOUS_ID="$(cd "$RELEASES_DIR" && ls -1t | grep -v '^\.previous$' | grep -v "^${CURRENT_TARGET}\$" | head -n1)"
fi

if [[ -z "$PREVIOUS_ID" || ! -d "${RELEASES_DIR}/${PREVIOUS_ID}" ]]; then
  echo "ERROR: No previous release available to roll back to. Aborting."
  exit 1
fi

echo "Rolling back to release: ${PREVIOUS_ID}"

# Atomic symlink cutover back to the previous release
ln -sfn "${RELEASES_DIR}/${PREVIOUS_ID}" "${APP_DIR}/current_tmp"
mv -Tf "${APP_DIR}/current_tmp" "$CURRENT_LINK"
echo "current -> releases/${PREVIOUS_ID}"

pm2 startOrReload "${CURRENT_LINK}/ecosystem.config.js" --update-env
pm2 save --force

echo "Rollback complete. PM2 process list:"
pm2 list
