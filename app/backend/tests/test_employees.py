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


@pytest.fixture
def auth_headers(client):
    resp = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "correct-horse-battery-staple"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_get_employee(client, auth_headers):
    create_resp = client.post(
        "/api/employees",
        json={"name": "Grace Hopper", "department": "Engineering", "start_date": "2020-01-15"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    employee_id = create_resp.json()["id"]

    get_resp = client.get(f"/api/employees/{employee_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Grace Hopper"


def test_list_employees_with_search(client, auth_headers):
    client.post(
        "/api/employees",
        json={"name": "Grace Hopper", "department": "Engineering", "start_date": "2020-01-15"},
        headers=auth_headers,
    )
    client.post(
        "/api/employees",
        json={"name": "Katherine Johnson", "department": "Research", "start_date": "2019-03-01"},
        headers=auth_headers,
    )

    resp = client.get("/api/employees?search=Grace", headers=auth_headers)
    assert resp.status_code == 200
    names = [e["name"] for e in resp.json()]
    assert names == ["Grace Hopper"]

    resp = client.get("/api/employees?department=Research", headers=auth_headers)
    assert [e["name"] for e in resp.json()] == ["Katherine Johnson"]


def test_update_employee(client, auth_headers):
    create_resp = client.post(
        "/api/employees",
        json={"name": "Grace Hopper", "department": "Engineering", "start_date": "2020-01-15"},
        headers=auth_headers,
    )
    employee_id = create_resp.json()["id"]

    update_resp = client.put(
        f"/api/employees/{employee_id}",
        json={"name": "Grace Hopper", "department": "Leadership", "start_date": "2020-01-15"},
        headers=auth_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["department"] == "Leadership"


def test_delete_employee(client, auth_headers):
    create_resp = client.post(
        "/api/employees",
        json={"name": "Grace Hopper", "department": "Engineering", "start_date": "2020-01-15"},
        headers=auth_headers,
    )
    employee_id = create_resp.json()["id"]

    delete_resp = client.delete(f"/api/employees/{employee_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    get_resp = client.get(f"/api/employees/{employee_id}", headers=auth_headers)
    assert get_resp.status_code == 404


def test_get_nonexistent_employee_returns_404(client, auth_headers):
    resp = client.get("/api/employees/9999", headers=auth_headers)
    assert resp.status_code == 404
