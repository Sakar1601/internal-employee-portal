# Internal Employee Portal — an Air-Gapped-Pattern IaC Lab

![Validate](https://github.com/Sakar1601/internal-employee-portal/actions/workflows/validate.yml/badge.svg)

A working internal web app — an employee directory, served over TLS,
backed by a real database — deployed the way an air-gapped enterprise
environment would deploy it: no live Terraform Registry, no cloud KMS for
Vault's auto-unseal, no public Ansible Galaxy/Automation Hub, and a target
host with a network-enforced (not just conventional) inability to reach
the public internet.

**What this is:** a personal lab project built to get real, hands-on
experience with these patterns — every command has actually been run, the
app is real and demonstrable, not a client engagement.

## What it demonstrates

- **Terraform** — a local provider mirror instead of the live registry
  (`terraform providers mirror`), a self-hosted S3-compatible state
  backend (MinIO), and a network topology (public subnet + VPC-only
  egress, private-subnet RDS) that makes "no internet access" a security
  group fact, not a promise.
- **Vault** — a dual-cluster Transit auto-unseal setup (no cloud KMS or
  HSM needed), an internal PKI issuing certs on demand, and dynamic
  short-lived database credentials via the `database` secrets engine —
  against a real RDS instance.
- **Ansible** — deploys a real Python app with zero `pip install` on the
  target (dependencies vendored and copied in, not fetched), fetches its
  secrets and TLS cert from Vault at deploy time, and runs it as a
  systemd service under a dedicated unprivileged user — through a real
  **AWX** instance (Projects, Credentials, Job Templates).
- **CI** — `terraform validate` + `ansible-lint` on every push
  (`.github/workflows/validate.yml`).

Full architecture, a diagram, and the reasoning behind two non-obvious
design decisions: [`infra/docs/architecture.md`](infra/docs/architecture.md).

## Quick start

```bash
git clone https://github.com/Sakar1601/internal-employee-portal.git && cd internal-employee-portal

infra/scripts/01-bring-up-services.sh    # registry, minio, gitea, vault-unseal
infra/scripts/02-bootstrap-vault.sh      # both Vault clusters, transit auto-unseal, PKI, AppRole
infra/scripts/03-terraform-apply.sh      # provider mirror, VPC/EC2/RDS, then wires Vault to real RDS
infra/scripts/04-awx-up.sh               # k3d + AWX, cross-network wiring

# deploy the app for real:
source secrets/ansible-approle.env
ansible-playbook -i "$(terraform -chdir=infra/terraform output -raw portal_public_ip)," \
  infra/ansible/site.yml \
  --private-key secrets/portal-lab-ssh-key -u ec2-user \
  -e vault_role_id=$ANSIBLE_ROLE_ID -e vault_secret_id=$ANSIBLE_SECRET_ID \
  -e db_host=$(terraform -chdir=infra/terraform output -raw rds_endpoint)

# then open https://<portal_public_ip>:8443/ — self-signed internal CA,
# your browser will warn about it, that's expected and correct

infra/scripts/99-teardown.sh             # tears everything down, verifies nothing billable remains
```

Each script prints a checkpoint and what to run next.
[`infra/docs/architecture.md`](infra/docs/architecture.md) covers what each piece is
standing in for, plus two design decisions worth understanding precisely
(where Vault-integration tasks actually execute, and how egress is locked
down without literally cutting the route).

## Project structure

```
infra/             all infrastructure-as-code and lab automation
  terraform/       VPC (public + private subnets), EC2, RDS — MinIO backend
  ansible/         site.yml + a role that deploys a real app and fetches its secrets from Vault
  vault/           Vault configs for both clusters (vault-main.hcl is generated, not committed)
  awx/             kustomize + AWX custom resource for the k3d install
  scripts/         the actual runbook, one script per phase
  docs/            architecture explanation + diagram
  docker-compose.yml
.github/workflows/ CI: terraform validate, ansible-lint
```

## What's real vs. what's simplified

| | |
|---|---|
| **Real** | AWS infrastructure including RDS, Vault's transit auto-unseal, dynamic DB credentials issued against a live database, PKI cert issuance, a working app you can open in a browser, AWX running real Job Templates |
| **Simplified for a solo lab** | TLS disabled on Vault's *own* listener (lab speed only, flagged inline — never do this for real; the app's TLS, from Vault PKI, is real), a self-signed PKI root instead of an offline org root CA, `registry:2` instead of Harbor, Gitea instead of GitLab |
| **Not literally true** | This is not a physically air-gapped network — it's a real AWS account reachable from the internet, with the *specific instance's* internet access removed at the security-group/egress level. That reproduces the operational discipline (mirror-only, no live registry calls, vendored dependencies) without genuine physical isolation |

## Cost

RDS `db.t3.micro` (750 hrs/month, 20GB) and EC2 `t2.micro` are both
free-tier eligible for 12 months. `infra/scripts/99-teardown.sh` destroys
everything and verifies via the AWS CLI that neither is still running —
check the AWS Billing dashboard once after your first apply regardless.
