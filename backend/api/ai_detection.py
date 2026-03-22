"""
AI Detection API: /api/ai/detect, /api/ai/verify
"""
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from models.user import User
from api.auth import get_current_user
from services.detection_service import run_detection_pipeline, run_repair_verification
from config import REPORTS_UPLOAD_DIR

router = APIRouter(prefix="/ai", tags=["AI Detection"])


@router.post("/detect")
async def detect_damage(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Run AI damage detection on uploaded image. Returns bounding boxes and severity."""
    if not image.filename:
        raise HTTPException(status_code=400, detail="No image file provided")

    # Save temp image
    temp_path = REPORTS_UPLOAD_DIR / f"detect_{current_user.id}_{image.filename}"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    result = run_detection_pipeline(str(temp_path))
    if not result["success"]:
        raise HTTPException(status_code=422, detail=result.get("error", "Detection failed"))

    return result


@router.post("/verify")
async def verify_repair_quality(
    before_image: UploadFile = File(...),
    after_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Compare before and after repair images to compute quality score."""
    before_path = REPORTS_UPLOAD_DIR / f"before_{current_user.id}_{before_image.filename}"
    after_path = REPORTS_UPLOAD_DIR / f"after_{current_user.id}_{after_image.filename}"

    with open(before_path, "wb") as f:
        shutil.copyfileobj(before_image.file, f)
    with open(after_path, "wb") as f:
        shutil.copyfileobj(after_image.file, f)

    result = run_repair_verification(str(before_path), str(after_path))
    return result
