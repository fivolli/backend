import os
import sys
from pathlib import Path

# Ensure Backend/ is importable when running from Backend/scripts
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

os.environ["DATABASE_URL"] = "sqlite:///./ai_test.db"
os.environ["DB_AUTO_CREATE"] = "true"

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

r = client.post(
    "/auth/register",
    json={"name": "Test", "email": None, "phone": "111", "password": "pw", "role": "user"},
)
print("register", r.status_code, r.text)

token = r.json()["access_token"]

r2 = client.post(
    "/ai/triage",
    json={"text": "болит голова 2 дня"},
    headers={"Authorization": f"Bearer {token}"},
)
print("ai", r2.status_code, r2.text)
