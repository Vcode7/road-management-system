"""
Contractor Selector
Multi-criteria contractor selection for a repair job.
Score = w1*rating + w2*completion_rate + w3*quality + w4*(1/distance) + w5*(1/cost_factor)
"""
from typing import Optional
from math import radians, cos, sin, asin, sqrt
from sqlalchemy.orm import Session
from models.contractor import Contractor


def _distance_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * R * asin(sqrt(a))


def score_contractor(contractor: Contractor, job_lat: float, job_lng: float,
                     estimated_cost: float) -> float:
    """Returns a 0-100 contractor suitability score for a job."""
    # Distance score (closer is better)
    if contractor.latitude and contractor.longitude:
        dist = _distance_km(contractor.latitude, contractor.longitude, job_lat, job_lng)
        dist_score = max(0, 1.0 - dist / contractor.service_radius_km)
    else:
        dist_score = 0.5

    # Normalize metrics to 0-1
    rating_score = contractor.rating / 5.0
    completion_score = contractor.completion_rate
    quality_score = contractor.average_quality_score / 100.0
    availability = 1.0 if contractor.is_available == "true" else 0.0

    total = (
        0.25 * rating_score +
        0.20 * completion_score +
        0.25 * quality_score +
        0.15 * dist_score +
        0.15 * availability
    )
    return round(total * 100, 2)


def select_best_contractor(db: Session, job_lat: float, job_lng: float,
                            estimated_cost: float,
                            damage_types: list = None) -> Optional[Contractor]:
    """Return best contractor for a job using multi-criteria scoring."""
    contractors = db.query(Contractor).filter(Contractor.is_available == "true").all()
    if not contractors:
        return None

    scored = [(c, score_contractor(c, job_lat, job_lng, estimated_cost)) for c in contractors]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[0][0] if scored else None
