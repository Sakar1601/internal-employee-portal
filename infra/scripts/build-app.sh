#!/usr/bin/env bash
# Builds the backend wheelhouse and frontend static bundle that
# scripts/03/Ansible copy to the instance -- nothing is installed or
# fetched on the target itself.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

echo "==> Building backend wheelhouse (targeting manylinux2014_x86_64, cp39)..."
rm -rf app/backend/wheelhouse
python3 -m pip download \
  --dest app/backend/wheelhouse \
  --platform manylinux2014_x86_64 \
  --python-version 39 \
  --implementation cp \
  --abi cp39 \
  --only-binary=:all: \
  -r app/backend/requirements.txt

echo "==> Building frontend static bundle..."
(cd app/frontend && npm ci && npm run build)

echo "==> Build artifacts ready: app/backend/wheelhouse/, app/frontend/dist/"
