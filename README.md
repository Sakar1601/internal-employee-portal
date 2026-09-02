# Internal Employee Portal

![Validate](https://github.com/Sakar1601/internal-employee-portal/actions/workflows/validate.yml/badge.svg)

A working internal web app — a JWT-authenticated employee directory with
real create/read/update/delete, built as a FastAPI backend and a separate
React frontend, backed by Postgres — deployed the way an air-gapped
enterprise environment would deploy it: no live Terraform Registry, no
cloud KMS for Vault's auto-unseal, no public Ansible Galaxy/Automation
Hub, a pip wheelhouse built ahead of time instead of installing packages
on the target, and a target host with a network-enforced (not just
conventional) inability to reach the public internet.

**What this is:** a personal portfolio project built to demonstrate two
things at once — application engineering (a real API, real auth, a real
frontend talking to it) and platform engineering (Terraform, Vault,
Ansible, and AWX standing up and deploying that app the way it would be
done in a regulated, network-isolated environment). Every command has
actually been run; nothing here is a mockup.

<!-- TODO: screenshot of the login page -->
<!-- TODO: screenshot of the employee list view -->

## Architecture

### Application

- **Backend** — FastAPI (`app/backend/app`), SQLAlchemy models against
  Postgres, and a small set of routers:
  - `POST /api/auth/login` — OAuth2 password flow, checks the submitted
    credentials against a single configured admin user (username plus a
    bcrypt password hash, both supplied via environment/settings — no
    self-registration), returns a signed JWT (`PyJWT`, HS256).
  - `GET/POST /api/employees`, `GET/PUT/DELETE /api/employees/{id}` — full
    CRUD over an `Employee` model (`name`, `department`, `start_date`),
    with optional `search` (name, case-insensitive) and `department`
    filters on the list endpoint. Every route in this router depends on
    `get_current_user`, which decodes and validates the bearer JWT — there
    is no unauthenticated path to employee data.
  - `GET /healthz` — unauthenticated liveness check.
  - In production, `app/main.py` also mounts the built React app
    (`app/frontend/dist`) as static files at `/`, so the same FastAPI
    process serves both the API and the UI.
- **Frontend** — React 19 + Vite (`app/frontend/src`), a login page and an
  employees page (table, live search-as-you-type with out-of-order
  response protection, an add/edit modal form, delete-with-confirm), all
  talking to the backend through a small `apiFetch` client that attaches
  the JWT and redirects to `/login` on a 401.
- **Data** — Postgres in production (RDS), SQLite for local dev — the app
  is unaware of which; `DATABASE_URL` is the only thing that changes.

### Platform

The full Terraform + Vault + Ansible + AWX story — the provider mirror,
Vault's dual-cluster Transit auto-unseal, dynamic short-lived database
credentials, internal PKI, the network topology that makes "no internet
access" a security-group fact rather than a promise, and the two design
decisions worth understanding precisely (where Vault-integration tasks
actually execute, and how egress is locked down without literally cutting
the route) — is documented in full, with a diagram, in
[`infra/docs/architecture.md`](infra/docs/architecture.md). That document
doesn't change with this rewrite; only the app it deploys does.

## Running it yourself

### Run the app locally

No AWS, Vault, or Ansible needed for this — just the backend and frontend
talking to each other and a local SQLite file.

```bash
cd app/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

export DATABASE_URL=sqlite:///./dev.db JWT_SECRET=dev-secret ADMIN_USERNAME=admin
python -c "import bcrypt; print(bcrypt.hashpw(b'dev-password', bcrypt.gensalt()).decode())"
# copy the printed hash into the next line
export ADMIN_PASSWORD_HASH='<paste hash here>'

uvicorn app.main:app --reload
```

In a second terminal:

```bash
cd app/frontend
npm install
npm run dev
```

Open `http://localhost:5173`, log in with `admin` / `dev-password`, and
use the UI — Vite's dev server proxies `/api` and `/healthz` to the
backend on `localhost:8000` (see `app/frontend/vite.config.js`).

### Deploy the full platform

```bash
git clone https://github.com/Sakar1601/internal-employee-portal.git && cd internal-employee-portal

infra/scripts/01-bring-up-services.sh    # registry, minio, gitea, vault-unseal
infra/scripts/02-bootstrap-vault.sh      # both Vault clusters, transit auto-unseal, PKI, AppRole
infra/scripts/03-terraform-apply.sh      # provider mirror, VPC/EC2/RDS, then wires Vault to real RDS
infra/scripts/04-awx-up.sh               # k3d + AWX, cross-network wiring

# build the deployable artifacts: a pip wheelhouse for the backend
# (downloaded ahead of time, targeting the instance's Python/platform, so
# nothing is fetched from the internet on the target) and the compiled
# React static bundle
infra/scripts/build-app.sh

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
app/
  backend/         FastAPI app: routers, models, schemas, auth, config
  frontend/         React + Vite: pages, components, API client
infra/             all infrastructure-as-code and lab automation
  terraform/       VPC (public + private subnets), EC2, RDS — MinIO backend
  ansible/         site.yml + a role that deploys the app and fetches its secrets from Vault
  vault/           Vault configs for both clusters (vault-main.hcl is generated, not committed)
  awx/             kustomize + AWX custom resource for the k3d install
  scripts/         the actual runbook, one script per phase, plus build-app.sh
  docs/            architecture explanation + diagram
  docker-compose.yml
.github/workflows/ CI: terraform validate, ansible-lint
```

## What's real vs. what's simplified

| | |
|---|---|
| **Real** | A working FastAPI + React app with JWT auth and full CRUD, AWS infrastructure including RDS, Vault's transit auto-unseal, dynamic DB credentials issued against a live database, PKI cert issuance, AWX running real Job Templates |
| **Simplified for a solo lab** | TLS disabled on Vault's *own* listener (lab speed only, flagged inline — never do this for real; the app's TLS, from Vault PKI, is real), a self-signed PKI root instead of an offline org root CA, `registry:2` instead of Harbor, Gitea instead of GitLab, a single hardcoded admin user instead of a full user/role system |
| **Not literally true** | This is not a physically air-gapped network — it's a real AWS account reachable from the internet, with the *specific instance's* internet access removed at the security-group/egress level. The app's own dependencies follow the same discipline via a pre-built pip wheelhouse (`infra/scripts/build-app.sh` downloads the exact wheels needed for the target platform ahead of time; Ansible copies them in and installs with `pip install --no-index --find-links=...`) — no live PyPI call from the target, and no hand-vendored source tree either |

## Cost

RDS `db.t3.micro` (750 hrs/month, 20GB) and EC2 `t2.micro` are both
free-tier eligible for 12 months. `infra/scripts/99-teardown.sh` destroys
everything and verifies via the AWS CLI that neither is still running —
check the AWS Billing dashboard once after your first apply regardless.
