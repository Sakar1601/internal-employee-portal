#!/usr/bin/env bash
# Populates a local provider mirror (the air-gapped pattern), applies
# Terraform (VPC, EC2, RDS), then finishes configuring Vault's database
# secrets engine now that the RDS endpoint actually exists.
set -euo pipefail

MIRROR_DIR="${TF_MIRROR_DIR:-$HOME/.cache/airgap-lab/terraform-mirror}"
MIRROR_SRC="/tmp/mirror-src"

if [ ! -d "$MIRROR_DIR" ]; then
  echo "==> Populating the provider mirror at $MIRROR_DIR..."
  mkdir -p "$MIRROR_SRC" && cd "$MIRROR_SRC"
  cat > main.tf <<'TFEOF'
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}
TFEOF
  terraform init
  mkdir -p "$MIRROR_DIR"
  terraform providers mirror "$MIRROR_DIR"
  cd -
else
  echo "==> Mirror already populated at $MIRROR_DIR, skipping."
fi

export TF_CLI_CONFIG_FILE="$(pwd)/terraform/.terraformrc.mirror"
cat > "$TF_CLI_CONFIG_FILE" <<EOF2
provider_installation {
  filesystem_mirror {
    path    = "$MIRROR_DIR"
    include = ["*/*/*"]
  }
}
EOF2

cd terraform

if [ -z "${TF_VAR_allowed_ssh_cidr:-}" ]; then
  MY_IP=$(curl -s https://checkip.amazonaws.com)
  echo "==> Detected your public IP as ${MY_IP} — set TF_VAR_allowed_ssh_cidr to override."
  export TF_VAR_allowed_ssh_cidr="${MY_IP}/32"
fi

if [ -z "${TF_VAR_db_master_password:-}" ]; then
  echo "==> No TF_VAR_db_master_password set — generating a random one."
  export TF_VAR_db_master_password=$(openssl rand -base64 24)
  echo "$TF_VAR_db_master_password" > ../secrets/rds-master-password.txt
  echo "    Saved to secrets/rds-master-password.txt (gitignored) — Vault uses this once, below."
fi

echo "==> terraform init (watch the output — this should resolve from the local mirror only)"
terraform init

echo "==> terraform plan"
terraform plan -out=tfplan

echo ""
echo "Review the plan above. This creates real (free-tier) AWS resources, including RDS."
read -p "Apply it? [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "Skipped apply. Re-run this script when ready."
  exit 0
fi

terraform apply tfplan

RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
PORTAL_IP=$(terraform output -raw portal_public_ip)
cd ..

echo "==> RDS is up at ${RDS_ENDPOINT} — configuring Vault's database secrets engine..."
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=$(jq -r '.root_token' secrets/main-cluster-keys.json)

vault secrets enable database || true
vault write database/config/portal-postgres \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@${RDS_ENDPOINT}:5432/portal?sslmode=require" \
  allowed_roles="app-role" \
  username="postgres" \
  password="${TF_VAR_db_master_password}"
vault write database/roles/app-role db_name=portal-postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';" \
  default_ttl="1h" max_ttl="24h"

echo "==> Proving it works — issuing a real dynamic credential against real RDS:"
vault read database/creds/app-role

cat <<EOF2

Terraform + Vault's database engine are both live.
  Portal will be reachable at: https://${PORTAL_IP}:8443/  (once Ansible deploys it)
  RDS endpoint: ${RDS_ENDPOINT}

Next: ./scripts/04-awx-up.sh, then run the playbook with:
  source secrets/ansible-approle.env
  ansible-playbook -i "${PORTAL_IP}," ansible/site.yml \\
    -e vault_role_id=\$ANSIBLE_ROLE_ID \\
    -e vault_secret_id=\$ANSIBLE_SECRET_ID \\
    -e db_host=${RDS_ENDPOINT}
EOF2
