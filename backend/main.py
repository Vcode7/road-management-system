"""
Sadak Kadak - FastAPI Main Application
Smart City Road Damage Reporting & Repair Management System
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import APP_NAME, DEBUG, API_PREFIX, ALLOWED_ORIGINS, UPLOAD_DIR
from database.connection import create_tables

# API Routers
from api.auth import router as auth_router
from api.reports import router as reports_router
from api.ai_detection import router as ai_router
from api.repair_jobs import router as jobs_router
from api.bids import router as bids_router
from api.agent import router as agent_router
from api.analytics import router as analytics_router
from api.contractors import router as contractors_router
from api.websocket import router as ws_router
from api.roads import router as roads_router

logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables and seed data if needed."""
    logger.info("Starting Sadak Kadak API...")
    create_tables()
    # Migrate existing SQLite DB to add snapped coordinate columns if missing
    from services.road_snap_service import add_snapped_columns_if_missing
    add_snapped_columns_if_missing()
    from database.seed import seed_demo_data
    seed_demo_data()
    logger.info("Database ready.")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title=APP_NAME,
    description="AI-powered Road Damage Reporting & Repair Management System for Smart Cities",
    version="1.0.0",
    debug=DEBUG,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving (uploaded images)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Mount all routers
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(reports_router, prefix=API_PREFIX)
app.include_router(ai_router, prefix=API_PREFIX)
app.include_router(jobs_router, prefix=API_PREFIX)
app.include_router(bids_router, prefix=API_PREFIX)
app.include_router(agent_router, prefix=API_PREFIX)
app.include_router(analytics_router, prefix=API_PREFIX)
app.include_router(contractors_router, prefix=API_PREFIX)
app.include_router(roads_router, prefix=API_PREFIX)
app.include_router(ws_router)  # WebSocket has no prefix


@app.get("/")
def root():
    return {
        "app": APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
