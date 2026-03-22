from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from models.repair_job import RepairJob, RepairJobReport, JobStatus
from models.report import Report, ReportStatus


def create_repair_job(db: Session, title: str, description: str, latitude: float,
                       longitude: float, address: Optional[str], estimated_cost: Optional[float],
                       estimated_area: Optional[float], deadline: Optional[datetime],
                       report_ids: List[str], created_by: str, priority_score: float = 0.0,
                       created_by_agent: bool = False) -> RepairJob:
    job = RepairJob(
        title=title,
        description=description,
        latitude=latitude,
        longitude=longitude,
        address=address,
        estimated_cost=estimated_cost,
        estimated_area=estimated_area,
        deadline=deadline,
        created_by=created_by,
        priority_score=priority_score,
        created_by_agent="true" if created_by_agent else "false",
    )
    db.add(job)
    db.flush()

    # Link reports
    for rid in report_ids:
        link = RepairJobReport(job_id=job.id, report_id=rid)
        db.add(link)
        # Update report status
        report = db.query(Report).filter(Report.id == rid).first()
        if report:
            report.status = ReportStatus.scheduled

    db.commit()
    db.refresh(job)
    return job


def get_jobs(db: Session, status: Optional[str] = None, contractor_id: Optional[str] = None,
             limit: int = 100, offset: int = 0) -> List[RepairJob]:
    query = db.query(RepairJob)
    if status:
        query = query.filter(RepairJob.status == status)
    if contractor_id:
        query = query.filter(RepairJob.assigned_contractor_id == contractor_id)
    return query.order_by(RepairJob.priority_score.desc()).offset(offset).limit(limit).all()


def get_job_by_id(db: Session, job_id: str) -> Optional[RepairJob]:
    return db.query(RepairJob).filter(RepairJob.id == job_id).first()


def assign_contractor(db: Session, job_id: str, contractor_id: str, bid_id: str) -> Optional[RepairJob]:
    job = db.query(RepairJob).filter(RepairJob.id == job_id).first()
    if job:
        job.assigned_contractor_id = contractor_id
        job.winning_bid_id = bid_id
        job.status = JobStatus.assigned
        db.commit()
        db.refresh(job)
    return job


def update_job_status(db: Session, job_id: str, status: str) -> Optional[RepairJob]:
    job = db.query(RepairJob).filter(RepairJob.id == job_id).first()
    if job:
        job.status = status
        db.commit()
        db.refresh(job)
    return job
