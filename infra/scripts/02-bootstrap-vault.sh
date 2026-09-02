#!/usr/bin/env bash
# Bootstraps the small unseal cluster, brings up the main cluster against it,
# and configures PKI + AppRole on the main cluster. The database secrets
# engine is configured separately in 03-terraform-apply.sh, once the RDS
# endpoint actually exists — Vault can't point at a database that isn't
# created yet.
#
# Writes files that must NEVER be committed (already in .gitignore):
#   secrets/unseal-cluster-keys.json
#   secrets/main-cluster-keys.json
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
mkdir -p secrets

export VAULT_ADDR=http://localhost:8210

echo "==> Initializing the unseal cluster..."
vault operator init -key-shares=3 -key-threshold=2 -format=json > secrets/unseal-cluster-keys.json
UNSEAL_ROOT_TOKEN=$(jq -r '.root_token' secrets/unseal-cluster-keys.json)

echo "==> Unsealing it (2 of 3 keys)..."
vault operator unseal "$(jq -r '.unseal_keys_b64[0]' secrets/unseal-cluster-keys.json)"
vault operator unseal "$(jq -r '.unseal_keys_b64[1]' secrets/unseal-cluster-keys.json)"

export VAULT_TOKEN="$UNSEAL_ROOT_TOKEN"

echo "==> Enabling transit and creating the autounseal key..."
vault secrets enable transit || true
vault write -f transit/keys/autounseal

vault policy write autounseal-policy - <<'POLICY'
path "transit/encrypt/autounseal" { capabilities = ["update"] }
path "transit/decrypt/autounseal" { capabilities = ["update"] }
POLICY

AUTOUNSEAL_TOKEN=$(vault token create -policy=autounseal-policy -period=768h -orphan -format=json | jq -r '.auth.client_token')

echo "==> Writing vault-main.hcl with the real autounseal token..."
sed "s|__AUTOUNSEAL_TOKEN__|${AUTOUNSEAL_TOKEN}|" infra/vault/vault-main.hcl.tmpl > infra/vault/vault-main.hcl

echo "==> Starting vault-main..."
docker compose -f infra/docker-compose.yml --profile main up -d vault-main
sleep 3

export VAULT_ADDR=http://localhost:8200
echo "==> Initializing the main cluster (no manual unseal — it auto-unseals via transit)..."
vault operator init -format=json > secrets/main-cluster-keys.json
MAIN_ROOT_TOKEN=$(jq -r '.root_token' secrets/main-cluster-keys.json)
export VAULT_TOKEN="$MAIN_ROOT_TOKEN"

echo "==> Confirming auto-unseal actually worked..."
vault status | grep -q "sealed.*false" && echo "    sealed: false — auto-unseal confirmed."

echo "==> Enabling PKI (self-signed root — lab only, see infra/docs/architecture.md)..."
vault secrets enable pki || true
vault secrets tune -max-lease-ttl=87600h pki
vault write pki/root/generate/internal common_name="lab.internal" ttl=87600h > /dev/null
vault write pki/roles/lab-internal allowed_domains="lab.internal" allow_subdomains=true max_ttl="720h" > /dev/null

echo "==> Enabling AppRole and creating the role Ansible actually authenticates as..."
vault auth enable approle || true
vault policy write ansible-portal - <<'POLICY'
path "database/creds/app-role" { capabilities = ["read"] }
path "pki/issue/lab-internal"  { capabilities = ["create", "update"] }
path "secret/data/portal-admin" { capabilities = ["read"] }
POLICY
vault write auth/approle/role/ansible-portal token_policies="ansible-portal" token_ttl=1h > /dev/null

ANSIBLE_ROLE_ID=$(vault read -field=role_id auth/approle/role/ansible-portal/role-id)
ANSIBLE_SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/ansible-portal/secret-id)
cat > secrets/ansible-approle.env <<CREDS
export TF_VAR_ansible_role_id=${ANSIBLE_ROLE_ID}
ANSIBLE_ROLE_ID=${ANSIBLE_ROLE_ID}
ANSIBLE_SECRET_ID=${ANSIBLE_SECRET_ID}
CREDS
echo "    AppRole credentials saved to secrets/ansible-approle.env (gitignored)."

cat <<EOF2

Vault is bootstrapped (PKI + AppRole ready; database secrets engine comes
after Terraform creates the RDS instance).
  vault-unseal root token : see secrets/unseal-cluster-keys.json (keep out of git)
  vault-main   root token : see secrets/main-cluster-keys.json   (keep out of git)
  VAULT_ADDR for the main cluster: http://localhost:8200

Checkpoint: run "docker compose -f infra/docker-compose.yml restart vault-main" then "vault status" —
it should come back with sealed: false, with zero manual unseal steps.

Next: ./infra/scripts/03-terraform-apply.sh
EOF2
