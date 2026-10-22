# Backend

FastAPI service: JWT login for a single configured admin, and CRUD over employees (`name`, `department`, `start_date`).

```
app/main.py        app factory, /healthz, mount_frontend (serves the built SPA)
app/auth.py        bcrypt check, HS256 JWT create/decode, get_current_user dependency
app/config.py      Settings read from the environment (and .env)
app/database.py    engine and session; DATABASE_URL picks SQLite or Postgres
app/models.py      Employee
app/schemas.py     request/response models; length limits mirror the column widths
app/routers/       auth.py and employees.py
tests/             pytest (in-memory SQLite, per-test admin credentials)
```

Run the tests: `JWT_SECRET=x python -m pytest` (needs `pip install -r requirements-dev.txt`). Environment variables are
listed in the [root README](../../README.md#configuration). `requirements.txt` pins exact versions because the
deployment builds an offline wheelhouse from it (`infra/scripts/build-app.sh`).
