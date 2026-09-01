#!/usr/bin/env bash
# Brings up everything except vault-main (needs a token from Vault bootstrap
# first) and Postgres (it's real AWS RDS now, created in Phase 03 — see
# docs/architecture.md for why local Docker Postgres wouldn't actually work).
set -euo pipefail

echo "==> Starting registry, minio, gitea, vault-unseal..."
docker compose up -d registry minio gitea vault-unseal

echo "==> Waiting for minio to report healthy..."
until docker compose ps minio --format json | grep -q '"Health":"healthy"'; do
  sleep 2
done

echo "==> Creating the tfstate bucket in MinIO..."
docker run --rm --network enclave-net --entrypoint sh minio/mc \
  -c "mc alias set local http://minio:9000 admin change-me-please && mc mb -p local/tfstate"

cat <<'EOF2'

Services are up:
  Registry     -> localhost:5050
  MinIO API    -> localhost:9000   (console: localhost:9001, admin / change-me-please)
  Gitea        -> localhost:3000   (complete the setup wizard, then create
                                     "portal-terraform" and "portal-ansible" repos)
  vault-unseal -> localhost:8210   (not yet initialized)

Next: ./scripts/02-bootstrap-vault.sh
EOF2
