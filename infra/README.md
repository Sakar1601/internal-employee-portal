# Infrastructure

Everything that deploys the portal the way an isolated enterprise would. Start with
[`docs/architecture.md`](docs/architecture.md) (diagram, why each piece exists, two design decisions worth reading).

| Path | Contents |
|---|---|
| `terraform/` | VPC, public/private subnets, EC2, RDS, security groups (12 resources); MinIO state backend |
| `ansible/` | `site.yml` and the `portal` role (21 tasks): Vault lookups, wheelhouse install, systemd unit |
| `vault/` | Configs for the `vault-unseal` and `vault-main` clusters |
| `awx/` | Kustomize + AWX custom resource for the k3d install |
| `docker-compose.yml` | Lab services: registry, MinIO, Gitea, vault-unseal, vault-main |
| `scripts/` | Runbook: `01` services, `02` Vault, `03` Terraform, `04` AWX, `build-app.sh`, `99-teardown.sh` |

This folder is separate from the root `compose.yaml`, which only runs the app locally.
