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

# The target's stock pip (bundled with its system Python 3.9 via ensurepip)
# is old enough that its --find-links directory scanner can't parse the
# compound multi-tag wheel filenames a modern pip download produces (e.g.
# "manylinux_2_17_x86_64.manylinux2014_x86_64") -- it recognizes the tags
# individually if you install a wheel by exact path, but silently finds
# nothing when scanning a directory of them. Bundle a modern pip wheel so
# Ansible can upgrade the venv's pip before installing anything else.
# Version is pinned to match the `pip==...` in
# infra/ansible/roles/portal/tasks/main.yml -- bump both together, or the
# --no-index install there will find no matching wheel in the wheelhouse.
python3 -m pip download \
  --dest app/backend/wheelhouse \
  --platform manylinux2014_x86_64 \
  --python-version 39 \
  --implementation cp \
  --abi cp39 \
  --only-binary=:all: \
  pip==26.0.1

echo "==> Building frontend static bundle..."
(cd app/frontend && npm ci && npm run build)

echo "==> Build artifacts ready: app/backend/wheelhouse/, app/frontend/dist/"
