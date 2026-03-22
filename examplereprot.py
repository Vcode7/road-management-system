"""
Sadak Kadak — Real Report Seed Script (Mobile-Equivalent)
=========================================================
Submits sample reports exactly like the mobile app (with image + AI trigger)
"""

import requests

BASE_URL = "http://localhost:8000/api"

CITIZEN_EMAIL    = "citizen@demo.com"
CITIZEN_PASSWORD = "demo1234"

# 👉 Put a real image in same folder
IMAGE_PATH = "sample.jpg"

REPORTS = [
    {"latitude": 17.6595, "longitude": 75.9068},
    {"latitude": 17.6602, "longitude": 75.9075},
    {"latitude": 17.6705, "longitude": 75.9125},
    {"latitude": 17.6718, "longitude": 75.9132},
    {"latitude": 17.6485, "longitude": 75.8908},
    {"latitude": 17.6478, "longitude": 75.8895},
    {"latitude": 17.6755, "longitude": 75.9245},
    {"latitude": 17.6762, "longitude": 75.9260},
    {"latitude": 17.6635, "longitude": 75.9155},
    {"latitude": 17.6628, "longitude": 75.9142},
]

# ── Step 1: Login ─────────────────────────────
print("🔐 Authenticating...")
login_resp = requests.post(
    f"{BASE_URL}/auth/login",
    json={"email": CITIZEN_EMAIL, "password": CITIZEN_PASSWORD},
)

if login_resp.status_code != 200:
    print("❌ Login failed:", login_resp.text)
    exit()

token = login_resp.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

print("✅ Logged in\n")

# ── Step 2: Submit reports (EXACT like mobile) ─────────
success = 0

for i, r in enumerate(REPORTS, start=1):
    with open(IMAGE_PATH, "rb") as img:

        files = {
            "images": ("report.jpg", img, "image/jpeg")  # ✅ SAME as mobile
        }

        data = {
            "latitude": str(r["latitude"]),
            "longitude": str(r["longitude"]),
            "damage_type": "unknown",              # ✅ SAME as mobile
            "description": "Reported via script",
            "road_type": "local",
            "traffic_density": "2.0",
        }

        resp = requests.post(
            f"{BASE_URL}/reports",
            headers=headers,
            data=data,
            files=files
        )

    try:
        result = resp.json()
    except:
        print(f"[{i:02d}] ❌ Invalid JSON response")
        continue

    if resp.status_code in (200, 201):
        print(
            f"[{i:02d}] ✅ id={result.get('id','?')[:8]} | "
            f"status={result.get('status')} | "
            f"severity={result.get('severity')} | "
            f"priority={result.get('priority_score')} | "
            f"snapped=({result.get('snapped_lat')}, {result.get('snapped_lng')})"
        )
        success += 1
    else:
        print(f"[{i:02d}] ❌ {resp.status_code}: {result}")

print(f"\n🏁 Done — {success}/{len(REPORTS)} reports submitted.")
print("🔥 Full pipeline executed: AI + Road Snap + Segments")