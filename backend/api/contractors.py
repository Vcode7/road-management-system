"""
Contractor Profile API: /api/contractors
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models.user import User, UserRole
from models.contractor import Contractor
from api.auth import get_current_user, require_role

router = APIRouter(prefix="/contractors", tags=["Contractors"])


class ContractorProfileRequest(BaseModel):
    company_name: str
    license_number: Optional[str] = None
    specialization: list = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    service_radius_km: float = 50.0


@router.post("/profile")
def create_profile(
    req: ContractorProfileRequest,
    current_user: User = Depends(require_role(UserRole.contractor)),
    db: Session = Depends(get_db),
):
    existing = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    if existing:
        # Update
        for field, val in req.dict().items():
            setattr(existing, field, val)
        db.commit()
        db.refresh(existing)
        return _contractor_dict(existing)

    contractor = Contractor(
        user_id=current_user.id,
        company_name=req.company_name,
        license_number=req.license_number,
        specialization=req.specialization,
        latitude=req.latitude,
        longitude=req.longitude,
        service_radius_km=req.service_radius_km,
    )
    db.add(contractor)
    db.commit()
    db.refresh(contractor)
    return _contractor_dict(contractor)


@router.get("/profile/me")
def my_profile(
    current_user: User = Depends(require_role(UserRole.contractor)),
    db: Session = Depends(get_db),
):
    contractor = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Profile not found. Please create one.")
    return _contractor_dict(contractor)


@router.get("")
def list_contractors(
    current_user: User = Depends(require_role(UserRole.authority, UserRole.admin)),
    db: Session = Depends(get_db),
):
    contractors = db.query(Contractor).all()
    return [_contractor_dict(c) for c in contractors]


@router.get("/{contractor_id}")
def get_contractor(
    contractor_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return _contractor_dict(contractor)


def _contractor_dict(c: Contractor) -> dict:
    return {
        "id": c.id,
        "user_id": c.user_id,
        "company_name": c.company_name,
        "license_number": c.license_number,
        "specialization": c.specialization,
        "rating": c.rating,
        "completed_jobs": c.completed_jobs,
        "total_jobs": c.total_jobs,
        "completion_rate": c.completion_rate,
        "average_quality_score": c.average_quality_score,
        "is_available": c.is_available,
        "service_radius_km": c.service_radius_km,
        "created_at": c.created_at,
    }
