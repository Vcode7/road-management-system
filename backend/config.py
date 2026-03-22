import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Database
DATABASE_URL = f"sqlite:///{BASE_DIR / 'sadak_kadak.db'}"

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "sadak-kadak-super-secret-key-2024-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# App
APP_NAME = "Sadak Kadak API"
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
API_PREFIX = "/api"

# Upload directories
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
REPORTS_UPLOAD_DIR = UPLOAD_DIR / "reports"
REPORTS_UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_UPLOAD_DIR = UPLOAD_DIR / "processed"
PROCESSED_UPLOAD_DIR.mkdir(exist_ok=True)
PROGRESS_UPLOAD_DIR = UPLOAD_DIR / "progress"
PROGRESS_UPLOAD_DIR.mkdir(exist_ok=True)

# AI Model
print(BASE_DIR.parent / "ai_models" / "weights" / "best.pt")
YOLO_WEIGHTS_PATH = r"E:\projects\sadak-kadak\backend\ai_models\weights\best.pt"
USE_REAL_MODEL = os.getenv("USE_REAL_MODEL", "true").lower() == "true"

# CORS
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

# Priority weights
SEVERITY_WEIGHTS = {"low": 1, "medium": 2, "high": 3, "critical": 4}
ROAD_IMPORTANCE_WEIGHTS = {"local": 1, "arterial": 2, "highway": 3}

# Google Roads API Key (used by backend road snap service)
GOOGLE_ROADS_API_KEY = os.getenv("GOOGLE_ROADS_API_KEY", "")
