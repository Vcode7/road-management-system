"""
Roads API: GET /api/roads
Returns pre-computed road segments with their linked reports' aggregate data.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database.connection import get_db
from models.road_segment import RoadSegment, ReportRoadMap
from models.report import Report, ReportStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/roads", tags=["Roads"])

# Severity ordering for computing "worst" severity on a segment
SEVERITY_RANK = {"low": 1, "medium": 2, "high": 3, "critical": 4}


def _worst_severity(severities: list) -> Optional[str]:
    filtered = [s for s in severities if s]
    if not filtered:
        return None
    return max(filtered, key=lambda s: SEVERITY_RANK.get(str(s), 0))


@router.get("")
def get_roads(
    severity: Optional[str] = Query(None, description="Filter by severity: low/medium/high/critical"),
    status: Optional[str] = Query(None, description="Filter reports by status"),
    db: Session = Depends(get_db),
):
    """
    Public endpoint — returns all road segments with aggregated report data.
    Used by authority dashboard map and mobile map screen.

    Aggregation intentionally excludes duplicate-status reports so that
    repeated submissions of the same damage do not skew priority scores.
    Duplicates are reported separately via 'duplicate_count'.
    """
    segments = db.query(RoadSegment).all()

    results = []
    for seg in segments:
        # Get all linked report IDs for this segment
        all_report_ids = [m.report_id for m in seg.report_maps]
        if not all_report_ids:
            continue

        all_reports_query = db.query(Report).filter(Report.id.in_(all_report_ids))

        # Apply optional status filter (only on non-duplicate reports for display filtering)
        if status:
            all_reports_query = all_reports_query.filter(Report.status == status)

        all_linked = all_reports_query.all()
        if not all_linked:
            continue

        # Split: canonical (non-duplicate) vs. duplicates
        canonical  = [r for r in all_linked if r.status != ReportStatus.duplicate]
        duplicates = [r for r in all_linked if r.status == ReportStatus.duplicate]

        # Aggregation driven by canonical reports only; fall back to all_linked if
        # every report on this segment happens to be a duplicate (edge case).
        base_reports = canonical if canonical else all_linked

        severities_list = [r.severity.value if hasattr(r.severity, 'value') else str(r.severity) for r in base_reports if r.severity]
        statuses_list   = [r.status.value if hasattr(r.status, 'value') else str(r.status) for r in all_linked if r.status]
        worst_sev       = _worst_severity(severities_list)

        # Segment-level severity filter
        if severity and worst_sev != severity:
            continue

        avg_priority = (
            sum(r.priority_score or 0 for r in base_reports) / len(base_reports)
        )

        results.append({
            "id": seg.id,
            "polyline": seg.polyline,             # [{lat, lng}, ...]
            "center_lat": seg.center_lat,
            "center_lng": seg.center_lng,
            "report_count": len(canonical),       # canonical non-duplicate reports
            "duplicate_count": len(duplicates),   # informational only
            "severity": worst_sev,
            "statuses": list(set(statuses_list)),
            "priority_score": round(avg_priority, 2),
            "report_ids": all_report_ids,
            "created_at": seg.created_at,
        })

    # Sort by priority descending
    results.sort(key=lambda x: x["priority_score"], reverse=True)
    return results
