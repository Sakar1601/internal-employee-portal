from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import mount_frontend


def _client(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log(1)")
    (tmp_path / "index.html").write_text("<html>spa</html>")
    (tmp_path / "logo.svg").write_text("<svg/>")
    app = FastAPI()
    mount_frontend(app, tmp_path)
    return TestClient(app)


def test_client_routes_fall_back_to_index(tmp_path):
    resp = _client(tmp_path).get("/activity")
    assert resp.status_code == 200 and "spa" in resp.text


def test_root_files_are_served(tmp_path):
    resp = _client(tmp_path).get("/logo.svg")
    assert resp.status_code == 200 and resp.text == "<svg/>"


def test_unknown_api_paths_are_404_not_html(tmp_path):
    client = _client(tmp_path)
    assert client.get("/api/typo").status_code == 404
    assert client.get("/api").status_code == 404


def test_path_traversal_does_not_escape_dist(tmp_path):
    secret = tmp_path.parent / "secret.txt"
    secret.write_text("TOP")
    resp = _client(tmp_path).get("/%2e%2e/secret.txt")
    assert "TOP" not in resp.text


def test_missing_dist_is_a_no_op(tmp_path):
    app = FastAPI()
    mount_frontend(app, tmp_path / "nope")
    assert TestClient(app).get("/").status_code == 404
