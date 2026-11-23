import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["DB_PATH"] = os.path.join(os.path.dirname(__file__), "test.db")
if os.path.exists(os.environ["DB_PATH"]):
    os.remove(os.environ["DB_PATH"])
os.environ.pop("GEMINI_API_KEY", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from estimate import estimate  # noqa: E402

FIX = json.load(open(os.path.join(os.path.dirname(__file__), "fixtures.json")))
client = TestClient(main.app)


@pytest.mark.parametrize("f", FIX, ids=[f["name"] for f in FIX])
def test_matches_browser_engine(f):
    e = estimate(f["measurements"], f["options"])
    assert e["totals"]["grand"] == pytest.approx(f["expected"]["grand"], rel=1e-9)
    assert e["totals"]["perSqft"] == pytest.approx(f["expected"]["perSqft"], rel=1e-9)
    for (name, qty, amount), m in zip(f["expected"]["materials"], e["materials"]):
        assert m["name"] == name and m["qty"] == qty and m["amount"] == pytest.approx(amount, rel=1e-9)


def test_health_and_presets():
    assert client.get("/api/health").json()["status"] == "ok"
    assert "dehradun" in client.get("/api/presets").json()


def test_estimate_endpoint():
    f = FIX[0]
    r = client.post("/api/estimate", json={"measurements": f["measurements"], "options": f["options"]})
    assert r.status_code == 200
    assert r.json()["totals"]["grand"] == pytest.approx(f["expected"]["grand"], rel=1e-9)


def test_estimate_rejects_bad_input():
    f = FIX[0]
    bad = {**f["measurements"], "builtArea": -5}
    assert client.post("/api/estimate", json={"measurements": bad}).status_code == 422
    assert client.post("/api/estimate", json={"measurements": f["measurements"], "options": {"grade": "gold"}}).status_code == 422


def test_projects_crud():
    p = {"name": "Test", "length": 40, "width": 30, "facing": "N", "bhk": 3, "villa": False, "thumb": "<svg></svg>"}
    pid = client.post("/api/projects", json=p).json()["id"]
    assert any(x["id"] == pid for x in client.get("/api/projects").json())
    assert client.delete(f"/api/projects/{pid}").status_code == 200
    assert client.delete(f"/api/projects/{pid}").status_code == 404
    assert client.post("/api/projects", json={**p, "facing": "X"}).status_code == 422


def test_chat_without_key_is_friendly():
    r = client.post("/api/chat", json={"question": "Slab kitni moti honi chahiye?"}).json()
    assert r["ok"] is False and "GEMINI_API_KEY" in r["reply"]
