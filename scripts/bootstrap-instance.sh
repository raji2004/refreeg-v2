#!/usr/bin/env bash
set -euo pipefail

# Runs once, at boot, on every new instance the ASG launches (invoked from the
# launch template's user-data — see infra/asg.tf). Baked into the base AMI at
# a fixed path by infra/packer/base-ami.pkr.hcl so it's always present even
# before the instance can reach anything else.
#
# It always fetches the LATEST remote-deploy.sh and the latest deployed
# release pointer from S3, then runs the exact same deploy logic every
# existing instance already ran — that's what makes scale-out "automatic":
# a brand-new instance ends up running whatever the fleet is currently on,
# with no separate provisioning script to keep in sync.

RELEASES_BUCKET="${RELEASES_BUCKET:?RELEASES_BUCKET env var is required (baked into user-data by Terraform)}"
SSM_PARAM_PATH="${SSM_PARAM_PATH:?SSM_PARAM_PATH env var is required (baked into user-data by Terraform)}"

echo "Bootstrapping instance — fetching latest deploy script and release pointer..."
aws s3 cp "s3://${RELEASES_BUCKET}/scripts/remote-deploy.sh" /tmp/remote-deploy.sh
chmod +x /tmp/remote-deploy.sh

RELEASE_ID="$(aws s3 cp "s3://${RELEASES_BUCKET}/current/release.txt" - | tr -d '[:space:]')"
if [[ -z "$RELEASE_ID" ]]; then
  echo "ERROR: current/release.txt in s3://${RELEASES_BUCKET} is empty. Has a release ever been deployed?"
  exit 1
fi

echo "Latest release pointer: ${RELEASE_ID}"
RELEASE_ID="$RELEASE_ID" RELEASES_BUCKET="$RELEASES_BUCKET" SSM_PARAM_PATH="$SSM_PARAM_PATH" \
  bash /tmp/remote-deploy.sh
