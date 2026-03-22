"""
Analytics API: /api/analytics
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.connection import get_db
from models.user import User, UserRole
from services.analytics_service import get_dashboard_stats, get_contractor_performance, get_reports_by_area
from api.auth import get_current_user, require_role

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
def dashboard_stats(
    current_user: User = Depends(require_role(UserRole.authority, UserRole.admin)),
    db: Session = Depends(get_db),
):
    return get_dashboard_stats(db)


@router.get("/contractors")
def contractor_performance(
    current_user: User = Depends(require_role(UserRole.authority, UserRole.admin)),
    db: Session = Depends(get_db),
):
    return get_contractor_performance(db)


@router.get("/heatmap")
def damage_heatmap(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_reports_by_area(db)
