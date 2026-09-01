#!/usr/bin/env python3
"""
Internal Employee Portal — the actual application this lab's infrastructure
automation exists to support.

Deliberately dependency-light: the only non-stdlib code used is the vendored,
pure-Python package tree copied in alongside this file (see ./vendor/).
Nothing is pip-installed on the target host, because the target host has no
route to PyPI — this mirrors exactly how software gets delivered in a real
air-gapped environment: staged and vendored ahead of time, not fetched live.
"""
import sys
import os
import json
import ssl
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "vendor"))
import pg8000.native  # noqa: E402  (import after sys.path fix, deliberately)

DB_HOST = os.environ["DB_HOST"]
DB_NAME = os.environ["DB_NAME"]
DB_USERNAME = os.environ["DB_USERNAME"]
DB_PASSWORD = os.environ["DB_PASSWORD"]
DB_CRED_LEASE_SECONDS = os.environ.get("DB_CRED_LEASE_SECONDS", "unknown")
TLS_CERT_FILE = os.environ.get("TLS_CERT_FILE")
TLS_KEY_FILE = os.environ.get("TLS_KEY_FILE")
PORT = int(os.environ.get("PORT", "8443"))

SEED_EMPLOYEES = [
    ("Amara Okafor", "Platform Engineering", "2023-02-14"),
    ("Priya Raman", "Security", "2022-08-01"),
    ("Kenji Watanabe", "Site Reliability", "2024-01-09"),
    ("Sofia Alvarez", "Finance", "2021-11-22"),
]


def get_connection():
    return pg8000.native.Connection(
        user=DB_USERNAME, password=DB_PASSWORD, host=DB_HOST, database=DB_NAME,
    )


def ensure_seeded(conn):
    conn.run(
        """
        CREATE TABLE IF NOT EXISTS employees (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            department TEXT NOT NULL,
            start_date DATE NOT NULL
        )
        """
    )
    count = conn.run("SELECT COUNT(*) FROM employees")[0][0]
    if count == 0:
        for name, dept, start in SEED_EMPLOYEES:
            conn.run(
                "INSERT INTO employees (name, department, start_date) "
                "VALUES (:n, :d, :s)",
                n=name, d=dept, s=start,
            )


def render_page(conn):
    rows = conn.run("SELECT name, department, start_date FROM employees ORDER BY name")
    rows_html = "\n".join(
        f"<tr><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>" for r in rows
    )
    masked_user = DB_USERNAME[:8] + "..." if len(DB_USERNAME) > 8 else DB_USERNAME
    tls_line = (
        "TLS: served using a certificate issued by this lab's internal Vault PKI"
        if TLS_CERT_FILE else
        "TLS: no cert found — running over plain HTTP (lab fallback only)"
    )
    return f"""<!doctype html>
<html><head><title>Internal Employee Portal</title>
<meta charset="utf-8">
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 720px;
          margin: 40px auto; color: #18181b; padding: 0 20px; }}
  h1 {{ font-size: 22px; margin-bottom: 4px; }}
  .sub {{ color: #71717a; font-size: 13px; margin-bottom: 20px; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th {{ text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase;
        letter-spacing: .05em; color: #94949c; border-bottom: 1px solid #d4d4d8; }}
  td {{ text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e5e8; font-size: 14px; }}
  .panel {{ background: #f7f7f8; border: 1px solid #e5e5e8; border-radius: 10px;
            padding: 16px 18px; margin-top: 28px; font-size: 12.5px; font-family: monospace; }}
  .panel b {{ display: block; margin-bottom: 8px; color: #059669; font-family: -apple-system, sans-serif; }}
</style></head>
<body>
  <h1>Internal Employee Portal</h1>
  <div class="sub">Served from a Terraform-provisioned host, configured by Ansible, secured by Vault.</div>
  <table>
    <tr><th>Name</th><th>Department</th><th>Start Date</th></tr>
    {rows_html}
  </table>
  <div class="panel">
    <b>Connection security (live, not decorative)</b>
    Database credential: {masked_user} — dynamic, Vault-issued, {DB_CRED_LEASE_SECONDS}s lease<br>
    {tls_line}
  </div>
</body></html>"""


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/healthz":
            self._respond(200, "application/json", json.dumps({"status": "ok"}).encode())
            return
        try:
            conn = get_connection()
            try:
                ensure_seeded(conn)
                body = render_page(conn).encode()
            finally:
                conn.close()
            self._respond(200, "text/html", body)
        except Exception as exc:  # noqa: BLE001 — deliberately broad for a lab health page
            self._respond(500, "text/plain", f"Error: {exc}".encode())

    def _respond(self, status, content_type, body):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    if TLS_CERT_FILE and TLS_KEY_FILE and Path(TLS_CERT_FILE).exists():
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(certfile=TLS_CERT_FILE, keyfile=TLS_KEY_FILE)
        server.socket = ctx.wrap_socket(server.socket, server_side=True)
        print(f"Serving HTTPS on :{PORT}")
    else:
        print(f"No TLS cert configured — serving plain HTTP on :{PORT} (lab fallback only)")
    server.serve_forever()


if __name__ == "__main__":
    main()
