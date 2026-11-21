# Contributing to Internal Employee Portal

Contributions are welcome.

## Getting set up

```sh
git clone https://github.com/Sakar1601/internal-employee-portal.git
cd internal-employee-portal
docker compose up --build   # http://localhost:8080
```

See the [README](README.md) for prerequisites and configuration.

## Workflow

1. Create a branch from `main`: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>` or `chore/<short-name>`.
2. Make focused changes. Keep unrelated changes in separate pull requests.
3. Run the checks locally before pushing:
   ```sh
   (cd app/backend && pip install -r requirements-dev.txt && JWT_SECRET=a-test-secret-of-at-least-32-characters python -m pytest)
   (cd app/frontend && npm ci && npm run lint && npm test && npm run build)
   (cd infra/terraform && terraform fmt -check)
   ```
4. Commit with [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
5. Open a pull request and fill in the template. CI must pass and conversations must be resolved before merging.
6. PRs are **squash-merged** into `main`, which is protected: no direct pushes, no force pushes, linear history.

## Reporting bugs and requesting features

Use the issue templates. For security problems, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Code style

Follow the existing conventions; formatting is governed by [`.editorconfig`](.editorconfig) and the project's linters.
Never commit secrets or `.env` files.
