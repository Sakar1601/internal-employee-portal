#!/usr/bin/env bash
# Tears everything down in an order that avoids orphaned AWS spend.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

echo "==> Closing the RDS SSH tunnel (opened by infra/scripts/03 so Vault, on your"
echo "    laptop, could reach RDS through the portal EC2 instance)..."
if [ -f secrets/rds-tunnel.pid ]; then
  kill "$(cat secrets/rds-tunnel.pid)" 2>/dev/null || echo "    (already gone)"
  rm -f secrets/rds-tunnel.pid
else
  pkill -f "15432:portal-lab-db" 2>/dev/null || echo "    (none found)"
fi

echo "==> Destroying Terraform-managed AWS resources..."
if [ -f infra/terraform/terraform.tfstate ] || [ -f infra/terraform/.terraform/terraform.tfstate ]; then
  (cd infra/terraform && terraform destroy)
fi

echo "==> Verifying nothing billable is still running..."
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=portal-lab" "Name=instance-state-name,Values=running,pending" \
  --query "Reservations[].Instances[].InstanceId" --output text | \
  grep -q . && echo "    WARNING: an EC2 instance is still running — check the AWS console." || \
  echo "    Confirmed: no matching EC2 instances running."

aws rds describe-db-instances \
  --query "DBInstances[?DBInstanceIdentifier=='portal-lab-db'].DBInstanceStatus" \
  --output text | grep -q . && echo "    WARNING: the RDS instance still exists — check the AWS console." || \
  echo "    Confirmed: no matching RDS instance found."

echo "==> Deleting the k3d cluster..."
k3d cluster delete awx-lab 2>/dev/null || echo "    (already gone)"

echo "==> Stopping Docker Compose services..."
docker compose -f infra/docker-compose.yml --profile main down -v

echo ""
echo "Teardown complete. Double-check the AWS Billing dashboard once,"
echo "since 'looked clean' and 'verified clean' are not the same thing."
