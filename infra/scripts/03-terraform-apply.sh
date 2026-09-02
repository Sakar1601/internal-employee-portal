#!/usr/bin/env bash
# Populates a local provider mirror (the air-gapped pattern), applies
# Terraform (VPC, EC2, RDS), then finishes configuring Vault's database
# secrets engine now that the RDS endpoint actually exists.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

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

export TF_CLI_CONFIG_FILE="$(pwd)/infra/terraform/.terraformrc.mirror"
cat > "$TF_CLI_CONFIG_FILE" <<EOF2
provider_installation {
  filesystem_mirror {
    path    = "$MIRROR_DIR"
    include = ["*/*/*"]
  }
}
EOF2

cd infra/terraform

if [ -z "${TF_VAR_allowed_ssh_cidr:-}" ]; then
  MY_IP=$(curl -s https://checkip.amazonaws.com)
  echo "==> Detected your public IP as ${MY_IP} — set TF_VAR_allowed_ssh_cidr to override."
  export TF_VAR_allowed_ssh_cidr="${MY_IP}/32"
fi

if [ -z "${TF_VAR_db_master_password:-}" ]; then
  echo "==> No TF_VAR_db_master_password set — generating a random one."
  # RDS rejects '/', '@', '"', and space in master passwords. base64 output
  # can contain '/', so use hex instead — always RDS-safe, still 96 bits
  # of entropy from 24 random bytes.
  export TF_VAR_db_master_password=$(openssl rand -hex 24)
  echo "$TF_VAR_db_master_password" > ../../secrets/rds-master-password.txt
  echo "    Saved to secrets/rds-master-password.txt (gitignored) — Vault uses this once, below."
fi

if [ ! -f ../../secrets/portal-lab-ssh-key.pub ]; then
  echo "==> No SSH key pair found — generating one for the portal instance."
  ssh-keygen -t ed25519 -f ../../secrets/portal-lab-ssh-key -N "" -C "portal-lab@internal-employee-portal"
  chmod 600 ../../secrets/portal-lab-ssh-key
  echo "    Saved to secrets/portal-lab-ssh-key(.pub) (gitignored) — this is how Ansible reaches the instance."
fi
export TF_VAR_portal_public_key=$(cat ../../secrets/portal-lab-ssh-key.pub)

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
cd ../..

echo "==> RDS is up at ${RDS_ENDPOINT}."
echo "    RDS has no route from your laptop at all (private subnets, no IGW —"
echo "    by design). vault-main can't reach it directly either. Opening an"
echo "    SSH tunnel through the portal EC2 instance, which IS in the VPC and"
echo "    can reach RDS, so Vault (in Docker) can reach it via host.docker.internal."

pkill -f "15432:${RDS_ENDPOINT}" 2>/dev/null || true
ssh -o StrictHostKeyChecking=accept-new -i secrets/portal-lab-ssh-key \
  -f -N -L "15432:${RDS_ENDPOINT}:5432" "ec2-user@${PORTAL_IP}"
echo "$(pgrep -f "15432:${RDS_ENDPOINT}" | head -1)" > secrets/rds-tunnel.pid
echo "    Tunnel PID saved to secrets/rds-tunnel.pid — infra/scripts/99-teardown.sh kills it."
echo "    This tunnel must stay running for as long as Vault needs to reach RDS"
echo "    (i.e. for the rest of this lab session, including the Ansible deploy)."

echo "==> Configuring Vault's database secrets engine..."
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=$(jq -r '.root_token' secrets/main-cluster-keys.json)

vault secrets enable database || true
vault write database/config/portal-postgres \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@host.docker.internal:15432/portal?sslmode=require" \
  allowed_roles="app-role" \
  username="postgres" \
  password="${TF_VAR_db_master_password}"
echo "==> Bootstrapping a stable group role so every dynamic credential can share"
echo "    the same tables, regardless of which ephemeral role created them..."
echo "    (Postgres 15+ no longer grants CREATE on 'public' by default, and every"
echo "    Vault-issued role has a different name -- without a shared group, each"
echo "    fresh dynamic role would be locked out of tables an earlier, now-expired"
echo "    role created.)"
python3 -c "import psycopg2" 2>/dev/null || pip install --user psycopg2-binary
python3 - <<PYEOF
import psycopg2
conn = psycopg2.connect(
    user="postgres", password="${TF_VAR_db_master_password}",
    host="localhost", port=15432, dbname="portal",
)
conn.autocommit = True
cur = conn.cursor()
cur.execute("SELECT 1 FROM pg_roles WHERE rolname = 'app_role_group'")
existing = cur.fetchone()
if not existing:
    cur.execute("CREATE ROLE app_role_group NOLOGIN")
    cur.execute("GRANT CREATE, USAGE ON SCHEMA public TO app_role_group")
    cur.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role_group")
    cur.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_role_group")
    print("    Created app_role_group.")
else:
    print("    app_role_group already exists, skipping.")
conn.close()
PYEOF

vault write database/roles/app-role db_name=portal-postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}' IN ROLE app_role_group; ALTER ROLE \"{{name}}\" SET role = app_role_group;" \
  default_ttl="1h" max_ttl="24h"

echo "==> Proving it works — issuing a real dynamic credential against real RDS:"
vault read database/creds/app-role

echo "==> Bootstrapping the portal's own admin/JWT secrets in Vault's KV store..."
vault secrets enable -path=secret kv-v2 2>&1 | grep -v "path is already in use" || true
if [ ! -f secrets/portal-admin-password.txt ]; then
  PORTAL_ADMIN_PASSWORD=$(openssl rand -hex 16)
  echo "$PORTAL_ADMIN_PASSWORD" > secrets/portal-admin-password.txt
  echo "    Generated portal admin password, saved to secrets/portal-admin-password.txt (gitignored)."
else
  PORTAL_ADMIN_PASSWORD=$(cat secrets/portal-admin-password.txt)
fi
python3 -c "import bcrypt" 2>/dev/null || pip install --user bcrypt
PORTAL_ADMIN_HASH=$(python3 -c "import bcrypt,sys; print(bcrypt.hashpw(sys.argv[1].encode(), bcrypt.gensalt()).decode())" "$PORTAL_ADMIN_PASSWORD")
if [ ! -f secrets/portal-jwt-secret.txt ]; then
  PORTAL_JWT_SECRET=$(openssl rand -hex 32)
  echo "$PORTAL_JWT_SECRET" > secrets/portal-jwt-secret.txt
  echo "    Generated portal JWT secret, saved to secrets/portal-jwt-secret.txt (gitignored)."
else
  PORTAL_JWT_SECRET=$(cat secrets/portal-jwt-secret.txt)
fi
vault kv put secret/portal-admin \
  jwt_secret="$PORTAL_JWT_SECRET" \
  admin_username="admin" \
  admin_password_hash="$PORTAL_ADMIN_HASH"

cat <<EOF2

Terraform + Vault's database engine are both live.
  Portal will be reachable at: https://${PORTAL_IP}:8443/  (once Ansible deploys it)
  RDS endpoint: ${RDS_ENDPOINT}

Next: ./infra/scripts/04-awx-up.sh, then run the playbook with:
  source secrets/ansible-approle.env
  ansible-playbook -i "${PORTAL_IP}," infra/ansible/site.yml \\
    -e vault_role_id=\$ANSIBLE_ROLE_ID \\
    -e vault_secret_id=\$ANSIBLE_SECRET_ID \\
    -e db_host=${RDS_ENDPOINT}
EOF2
