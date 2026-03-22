"""
Repair Jobs API: /api/jobs
"""
import shutil
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models.user import User, UserRole
from models.repair_job import RepairJob, JobStatus
from models.repair_progress import RepairProgress, RepairStage
from models.contractor import Contractor
from services.job_service import create_repair_job, get_jobs, get_job_by_id, assign_contractor, update_job_status
from api.auth import get_current_user, require_role
from config import PROGRESS_UPLOAD_DIR

router = APIRouter(prefix="/jobs", tags=["Repair Jobs"])


class JobCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    estimated_cost: Optional[float] = None
    estimated_area: Optional[float] = None
    deadline: Optional[datetime] = None
    report_ids: List[str] = []
    priority_score: float = 0.0


@router.post("")
def create_job(
    req: JobCreateRequest,
    current_user: User = Depends(require_role(UserRole.authority, UserRole.admin)),
    db: Session = Depends(get_db),
):
    job = create_repair_job(
        db=db,
        title=req.title,
        description=req.description,
        latitude=req.latitude,
        longitude=req.longitude,
        address=req.address,
        estimated_cost=req.estimated_cost,
        estimated_area=req.estimated_area,
        deadline=req.deadline,
        report_ids=req.report_ids,
        created_by=current_user.id,
        priority_score=req.priority_score,
    )
    return _job_dict(job)


@router.get("")
def list_jobs(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contractor_id = None
    if current_user.role == UserRole.contractor:
        profile = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
        if profile:
            contractor_id = profile.id
    jobs = get_jobs(db, status=status, limit=limit, offset=offset)
    return [_job_dict(j) for j in jobs]


@router.get("/{job_id}")
def get_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_dict(job)


@router.post("/{job_id}/assign")
def assign_job(
    job_id: str,
    contractor_id: str,
    bid_id: str,
    current_user: User = Depends(require_role(UserRole.authority, UserRole.admin)),
    db: Session = Depends(get_db),
):
    job = assign_contractor(db, job_id, contractor_id, bid_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_dict(job)


@router.patch("/{job_id}/progress")
async def update_progress(
    job_id: str,
    stage: str = Form(...),
    notes: Optional[str] = Form(None),
    images: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    image_paths = []
    for img in images:
        if img.filename:
            dest = PROGRESS_UPLOAD_DIR / f"{job_id}_{stage}_{img.filename}"
            with open(dest, "wb") as f:
                shutil.copyfileobj(img.file, f)
            image_paths.append(str(dest))

    progress = RepairProgress(
        job_id=job_id,
        stage=stage,
        images=image_paths,
        notes=notes,
        reported_by=current_user.id,
    )
    db.add(progress)

    # Update job status based on stage
    stage_to_status = {
        "materials_ready": JobStatus.in_progress,
        "repair_started": JobStatus.in_progress,
        "repair_completed": JobStatus.in_progress,
        "inspection_pending": JobStatus.in_progress,
        "verified": JobStatus.verified,
    }
    if stage in stage_to_status:
        job.status = stage_to_status[stage]

    db.commit()
    return {"message": "Progress updated", "stage": stage, "job_id": job_id}


def _job_dict(j: RepairJob) -> dict:
    return {
        "id": j.id,
        "title": j.title,
        "description": j.description,
        "latitude": j.latitude,
        "longitude": j.longitude,
        "address": j.address,
        "estimated_cost": j.estimated_cost,
        "estimated_area": j.estimated_area,
        "status": j.status,
        "priority_score": j.priority_score,
        "deadline": j.deadline,
        "assigned_contractor_id": j.assigned_contractor_id,
        "winning_bid_id": j.winning_bid_id,
        "created_by": j.created_by,
        "created_by_agent": j.created_by_agent,
        "created_at": j.created_at,
        "report_count": len(j.report_links),
        "bid_count": len(j.bids),
        "progress": [
            {"stage": p.stage, "notes": p.notes, "images": p.images, "timestamp": p.timestamp,
             "quality_score": p.quality_score}
            for p in sorted(j.progress_updates, key=lambda x: x.timestamp)
        ],
    }
