#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: infra/aws/deploy-ui.sh <s3-bucket-name>"
  exit 1
fi

BUCKET="$1"
pnpm --filter @clanworld/demo-web build
aws s3 sync apps/demo-web/dist "s3://${BUCKET}" --delete
