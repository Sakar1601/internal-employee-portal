import os

import bcrypt
import pytest


@pytest.fixture(autouse=True)
def admin_credentials(monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv(
        "ADMIN_PASSWORD_HASH",
        bcrypt.hashpw(b"correct-horse-battery-staple", bcrypt.gensalt()).decode(),
    )
    from app.config import get_settings

    get_settings.cache_clear()


def test_login_with_correct_password_returns_token(client):
    resp = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "correct-horse-battery-staple"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 20


def test_login_with_wrong_password_returns_401(client):
    resp = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "wrong-password"},
    )
    assert resp.status_code == 401


def test_protected_endpoint_rejects_missing_token(client):
    resp = client.get("/api/employees")
    assert resp.status_code == 401


def test_protected_endpoint_accepts_valid_token(client):
    login = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "correct-horse-battery-staple"},
    )
    token = login.json()["access_token"]
    resp = client.get("/api/employees", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
