#!/usr/bin/env bash
# Brings up AWX in a k3d cluster and connects it to the same Docker network
# as Vault/Gitea/etc — see infra/docs/architecture.md for why this step exists.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

echo "==> Creating the k3d cluster..."
k3d cluster create awx-lab --servers 1 --agents 1
kubectl create namespace awx

echo "==> Installing the awx-operator..."
kubectl apply -k infra/awx/
kubectl wait --for=condition=Ready pod -l control-plane=controller-manager -n awx --timeout=180s

echo "==> Creating the AWX instance (this takes several minutes the first time)..."
kubectl apply -f infra/awx/awx-instance.yml -n awx
echo "    Watching pods — ctrl-C once everything shows Running/Completed:"
kubectl get pods -n awx --watch &
WATCH_PID=$!
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/managed-by=awx-operator -n awx --timeout=600s || true
kill $WATCH_PID 2>/dev/null || true

echo "==> Connecting the k3d node to enclave-net so AWX can reach Vault/Gitea..."
docker network connect enclave-net k3d-awx-lab-server-0 2>/dev/null || echo "    (already connected)"

VAULT_IP=$(docker inspect vault-main --format '{{ index .NetworkSettings.Networks "enclave-net" "IPAddress" }}')
GITEA_IP=$(docker inspect gitea      --format '{{ index .NetworkSettings.Networks "enclave-net" "IPAddress" }}')

ADMIN_PW=$(kubectl get secret awx-demo-admin-password -n awx -o jsonpath="{.data.password}" | base64 --decode)

cat <<EOF

AWX is up.
  UI:       run 'kubectl port-forward svc/awx-demo-service 8052:80 -n awx'
            then open http://localhost:8052
  Login:    admin / ${ADMIN_PW}

  Use these IPs (not container names) when configuring the Project/Credential in AWX:
    Vault (vault-main):  http://${VAULT_IP}:8200
    Gitea:                http://${GITEA_IP}:3000

Next: create the Project + Credential + Job Template as described in
infra/docs/architecture.md, or in the original lab guide, Section 04.
EOF
