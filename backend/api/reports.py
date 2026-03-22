"""
Reports API: /api/reports
"""
import os
import shutil
import logging
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models.user import User, UserRole
from models.report import Report, ReportStatus
from services.report_service import (
    get_reports, get_report_by_id, create_report, update_report_status, get_nearby_reports
)
from services.detection_service import run_detection_pipeline
from api.auth import get_current_user, require_role
from config import REPORTS_UPLOAD_DIR, PROCESSED_UPLOAD_DIR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("")
async def submit_report(
    latitude: float = Form(...),
    longitude: float = Form(...),
    damage_type: str = Form(...),
    severity: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    road_name: Optional[str] = Form(None),
    road_type: str = Form("local"),
    traffic_density: float = Form(1.0),
    images: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Save uploaded images
    image_urls = []
    for img in images:
        if img.filename:
            safe_name = f"{current_user.id}_{img.filename}"
            dest = REPORTS_UPLOAD_DIR / safe_name
            with open(dest, "wb") as f:
                shutil.copyfileobj(img.file, f)
            image_urls.append(str(dest))

    # Auto-trigger AI detection if images present
    ai_result = None
    processed_image_urls = []
    if image_urls:
        try:
            ai_result = run_detection_pipeline(image_urls[0])
            if ai_result.get("success") and not severity:
                severity = ai_result.get("overall_severity", severity)
            if ai_result.get("success") and ai_result.get("detections"):
                first_det = ai_result["detections"][0]
                if not damage_type or damage_type == "unknown":
                    damage_type = first_det.get("damage_type", damage_type)
            # Collect the annotated image path
            if ai_result.get("annotated_image"):
                processed_image_urls = [ai_result["annotated_image"]]
        except Exception as e:
            logger.warning(f"AI detection failed: {e}")

    report = create_report(
        db=db,
        user_id=current_user.id,
        latitude=latitude,
        longitude=longitude,
        damage_type=damage_type,
        severity=severity,
        description=description,
        road_name=road_name,
        road_type=road_type,
        traffic_density=traffic_density,
        image_urls=image_urls,
        ai_detection_result=ai_result,
        processed_image_urls=processed_image_urls,
    )
    return _report_dict(report)


@router.get("")
def list_reports(
    status: Optional[str] = None,
    damage_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = current_user.role
    uid = current_user.id if role == UserRole.citizen else None
    reports = get_reports(db, user_id=uid, role=role, status=status,
                          damage_type=damage_type, limit=limit, offset=offset)
    return [_report_dict(r) for r in reports]


@router.get("/public/recent")
def public_recent_reports(
    limit: int = 5,
    db: Session = Depends(get_db),
):
    """Public endpoint — no auth required. Returns recent reports with limited fields."""
    reports = get_reports(db, limit=limit, offset=0)
    return [
        {
            "id": r.id,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "road_name": r.road_name,
            "damage_type": r.damage_type,
            "severity": r.severity,
            "status": r.status,
            "priority_score": r.priority_score,
            "created_at": r.created_at,
        }
        for r in reports
    ]


@router.get("/nearby")
def nearby_reports(
    lat: float,
    lng: float,
    radius_km: float = 2.0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reports = get_nearby_reports(db, lat, lng, radius_km)
    return [_report_dict(r) for r in reports]


@router.get("/{report_id}")
def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    report = get_report_by_id(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return _report_dict(report)


class StatusUpdateRequest(BaseModel):
    status: str

@router.patch("/{report_id}/status")
def update_status(
    report_id: str,
    status: Optional[str] = None,
    body: Optional[StatusUpdateRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.citizen:
        raise HTTPException(status_code=403, detail="Citizens cannot update report status")
    # Accept status from query param OR request body
    new_status = status or (body.status if body else None)
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    report = update_report_status(db, report_id, new_status, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return _report_dict(report)


def _report_dict(r: Report) -> dict:
    return {
        "id": r.id,
        "user_id": r.user_id,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "snapped_lat": r.snapped_lat,
        "snapped_lng": r.snapped_lng,
        "road_name": r.road_name,
        "road_type": r.road_type,
        "damage_type": r.damage_type.value if hasattr(r.damage_type, 'value') else str(r.damage_type),
        "severity": r.severity.value if hasattr(r.severity, 'value') else str(r.severity),
        "status": r.status.value if hasattr(r.status, 'value') else str(r.status),
        "priority_score": r.priority_score,
        "description": r.description,
        "image_urls": r.image_urls,
        "processed_image_urls": r.processed_image_urls or [],
        "ai_detection_result": {
            **(r.ai_detection_result or {}),
            # Backfill annotated_image so the dashboard modal slot works immediately
            "annotated_image": (
                (r.processed_image_urls or [None])[0]
                or (r.ai_detection_result or {}).get("annotated_image")
            ),
        } if r.ai_detection_result else None,
        "traffic_density": r.traffic_density,
        "is_duplicate": r.is_duplicate,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
        "damages": [
            {
                "id": d.id, "damage_type": d.damage_type, "bbox": d.bbox,
                "confidence": d.confidence, "width_cm": d.width_estimate,
                "area_cm2": d.area_estimate, "severity": d.severity
            }
            for d in (r.damages or [])
        ],
    }
