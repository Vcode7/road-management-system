from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any

from models.report import Report, ReportStatus, SeverityLevel
from models.repair_job import RepairJob, JobStatus
from models.bid import Bid
from models.contractor import Contractor
from models.repair_progress import RepairProgress


def get_dashboard_stats(db: Session) -> Dict[str, Any]:
    total_reports = db.query(func.count(Report.id)).scalar() or 0
    open_reports = db.query(func.count(Report.id)).filter(
        Report.status == ReportStatus.submitted).scalar() or 0
    in_progress = db.query(func.count(Report.id)).filter(
        Report.status == ReportStatus.repairing).scalar() or 0
    completed = db.query(func.count(Report.id)).filter(
        Report.status == ReportStatus.completed).scalar() or 0

    total_jobs = db.query(func.count(RepairJob.id)).scalar() or 0
    open_jobs = db.query(func.count(RepairJob.id)).filter(
        RepairJob.status == JobStatus.open).scalar() or 0

    total_contractors = db.query(func.count(Contractor.id)).scalar() or 0

    # Severity breakdown
    critical = db.query(func.count(Report.id)).filter(
        Report.severity == SeverityLevel.critical).scalar() or 0
    high = db.query(func.count(Report.id)).filter(
        Report.severity == SeverityLevel.high).scalar() or 0
    medium = db.query(func.count(Report.id)).filter(
        Report.severity == SeverityLevel.medium).scalar() or 0
    low = db.query(func.count(Report.id)).filter(
        Report.severity == SeverityLevel.low).scalar() or 0

    # Road health score (0-100) — reverse of damage density
    road_health = max(0, 100 - (critical * 10 + high * 5 + medium * 2 + low * 1))

    # Avg priority score
    avg_priority = db.query(func.avg(Report.priority_score)).scalar() or 0.0

    return {
        "total_reports": total_reports,
        "open_reports": open_reports,
        "in_progress": in_progress,
        "completed": completed,
        "total_jobs": total_jobs,
        "open_jobs": open_jobs,
        "total_contractors": total_contractors,
        "road_health_score": round(road_health, 1),
        "avg_priority_score": round(avg_priority, 2),
        "severity_breakdown": {
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low,
        },
    }


def get_contractor_performance(db: Session):
    contractors = db.query(Contractor).all()
    return [
        {
            "id": c.id,
            "company_name": c.company_name,
            "rating": c.rating,
            "completed_jobs": c.completed_jobs,
            "completion_rate": c.completion_rate,
            "avg_quality_score": c.average_quality_score,
        }
        for c in contractors
    ]


def get_reports_by_area(db: Session):
    """Get reports grouped by location for heatmap."""
    reports = db.query(
        Report.latitude, Report.longitude, Report.severity, Report.status
    ).all()
    return [
        {"lat": r.latitude, "lng": r.longitude, "severity": r.severity, "status": r.status}
        for r in reports
    ]
