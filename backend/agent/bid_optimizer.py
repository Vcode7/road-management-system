"""
Bid Optimizer
Analyzes bids for a job; rejects outliers (too expensive or suspiciously cheap).
Uses IQR-based outlier detection on bid prices.
"""
import logging
from sqlalchemy.orm import Session
from models.bid import Bid, BidStatus
from models.repair_job import RepairJob, JobStatus
from models.contractor import Contractor

logger = logging.getLogger(__name__)


def _iqr_bounds(prices: list):
    if len(prices) < 3:
        return None, None
    sorted_p = sorted(prices)
    n = len(sorted_p)
    q1 = sorted_p[n // 4]
    q3 = sorted_p[(3 * n) // 4]
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    return lower, upper


def optimize_bids(db: Session) -> dict:
    """
    For jobs in bidding status:
    - Reject outlier bids
    - Score remaining bids
    - Auto-assign best bid if confidence high
    """
    actions = []
    count = 0

    bidding_jobs = db.query(RepairJob).filter(RepairJob.status == JobStatus.bidding).all()

    for job in bidding_jobs:
        pending_bids = [b for b in job.bids if b.status == BidStatus.pending]
        if len(pending_bids) < 2:
            continue

        prices = [b.price for b in pending_bids]
        lower, upper = _iqr_bounds(prices)

        for bid in pending_bids:
            if lower is not None and (bid.price < lower or bid.price > upper):
                bid.status = BidStatus.rejected
                actions.append(f"Rejected outlier bid {bid.id} (price={bid.price})")
                count += 1
            else:
                # Score bid
                contractor = db.query(Contractor).filter(Contractor.id == bid.contractor_id).first()
                rating_score = (contractor.rating / 5.0) if contractor else 0.5
                time_score = max(0, 1.0 - bid.repair_time_days / 30.0)
                price_score = 1.0 - (bid.price / max(prices))
                bid.ai_score = round((0.4 * rating_score + 0.3 * time_score + 0.3 * price_score) * 100, 1)

        db.commit()

    return {"actions": actions, "count": count}
