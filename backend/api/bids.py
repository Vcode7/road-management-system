"""
Bids API: /api/jobs/{job_id}/bids
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models.user import User, UserRole
from models.contractor import Contractor
from services.bid_service import submit_bid, get_bids_for_job, get_bids_for_contractor, accept_bid, reject_bid
from services.job_service import assign_contractor
from api.auth import get_current_user, require_role

router = APIRouter(tags=["Bids"])


class BidRequest(BaseModel):
    price: float
    repair_time_days: float
    materials: List[str] = []
    notes: Optional[str] = None


@router.post("/jobs/{job_id}/bid")
def submit_job_bid(
    job_id: str,
    req: BidRequest,
    current_user: User = Depends(require_role(UserRole.contractor)),
    db: Session = Depends(get_db),
):
    contractor = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor profile not found")
    bid = submit_bid(db, job_id, contractor.id, req.price, req.repair_time_days,
                     req.materials, req.notes)
    return _bid_dict(bid)


@router.get("/jobs/{job_id}/bids")
def list_job_bids(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [_bid_dict(b) for b in get_bids_for_job(db, job_id)]


@router.get("/my-bids")
def my_bids(
    current_user: User = Depends(require_role(UserRole.contractor)),
    db: Session = Depends(get_db),
):
    contractor = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    if not contractor:
        return []
    return [_bid_dict(b) for b in get_bids_for_contractor(db, contractor.id)]


@router.post("/bids/{bid_id}/accept")
def accept_job_bid(
    bid_id: str,
    current_user: User = Depends(require_role(UserRole.authority, UserRole.admin)),
    db: Session = Depends(get_db),
):
    bid = accept_bid(db, bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    # Assign contractor to job
    assign_contractor(db, bid.job_id, bid.contractor_id, bid_id)
    return _bid_dict(bid)


@router.post("/bids/{bid_id}/reject")
def reject_job_bid(
    bid_id: str,
    current_user: User = Depends(require_role(UserRole.authority, UserRole.admin)),
    db: Session = Depends(get_db),
):
    bid = reject_bid(db, bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    return _bid_dict(bid)


class ReproposalRequest(BaseModel):
    suggested_price: float
    notes: Optional[str] = None


@router.post("/bids/{bid_id}/repropose")
def repropose_bid(
    bid_id: str,
    req: ReproposalRequest,
    current_user: User = Depends(require_role(UserRole.authority, UserRole.admin)),
    db: Session = Depends(get_db),
):
    """Authority sends a counter-offer to a contractor's bid."""
    from models.bid import Bid
    bid = db.query(Bid).filter(Bid.id == bid_id).first()
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    bid.status = "reproposed"
    bid.notes = f"[COUNTER-OFFER ₹{req.suggested_price:,.0f}] {req.notes or ''}\n---\nOriginal bid: ₹{bid.price:,.0f} | {bid.notes or ''}"
    db.commit()
    db.refresh(bid)
    return _bid_dict(bid)


def _bid_dict(b) -> dict:
    return {
        "id": b.id,
        "job_id": b.job_id,
        "contractor_id": b.contractor_id,
        "price": b.price,
        "repair_time_days": b.repair_time_days,
        "materials": b.materials,
        "notes": b.notes,
        "status": b.status,
        "ai_score": b.ai_score,
        "created_at": b.created_at,
    }
