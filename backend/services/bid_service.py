from typing import List, Optional
from sqlalchemy.orm import Session
from models.bid import Bid, BidStatus
from models.repair_job import RepairJob, JobStatus
from models.contractor import Contractor


def submit_bid(db: Session, job_id: str, contractor_id: str, price: float,
               repair_time_days: float, materials: List[str], notes: Optional[str] = None) -> Bid:
    # Check if contractor already bid on this job
    existing = db.query(Bid).filter(
        Bid.job_id == job_id,
        Bid.contractor_id == contractor_id,
        Bid.status == BidStatus.pending
    ).first()
    if existing:
        existing.price = price
        existing.repair_time_days = repair_time_days
        existing.materials = materials
        existing.notes = notes
        db.commit()
        db.refresh(existing)
        return existing

    bid = Bid(
        job_id=job_id,
        contractor_id=contractor_id,
        price=price,
        repair_time_days=repair_time_days,
        materials=materials,
        notes=notes,
    )
    db.add(bid)

    # Move job to bidding status
    job = db.query(RepairJob).filter(RepairJob.id == job_id).first()
    if job and job.status == JobStatus.open:
        job.status = JobStatus.bidding

    db.commit()
    db.refresh(bid)
    return bid


def get_bids_for_job(db: Session, job_id: str) -> List[Bid]:
    return db.query(Bid).filter(Bid.job_id == job_id).all()


def get_bids_for_contractor(db: Session, contractor_id: str) -> List[Bid]:
    return db.query(Bid).filter(Bid.contractor_id == contractor_id)\
             .order_by(Bid.created_at.desc()).all()


def accept_bid(db: Session, bid_id: str) -> Optional[Bid]:
    bid = db.query(Bid).filter(Bid.id == bid_id).first()
    if bid:
        bid.status = BidStatus.accepted
        # Reject other bids for same job
        db.query(Bid).filter(
            Bid.job_id == bid.job_id,
            Bid.id != bid_id
        ).update({"status": BidStatus.rejected})
        db.commit()
        db.refresh(bid)
    return bid


def reject_bid(db: Session, bid_id: str) -> Optional[Bid]:
    bid = db.query(Bid).filter(Bid.id == bid_id).first()
    if bid:
        bid.status = BidStatus.rejected
        db.commit()
        db.refresh(bid)
    return bid
