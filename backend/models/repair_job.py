import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, JSON, Enum as SAEnum, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from database.connection import Base
import enum


class JobStatus(str, enum.Enum):
    open = "open"
    bidding = "bidding"
    assigned = "assigned"
    in_progress = "in_progress"
    completed = "completed"
    verified = "verified"
    cancelled = "cancelled"


class RepairJob(Base):
    __tablename__ = "repair_jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    estimated_cost = Column(Float, nullable=True)
    estimated_area = Column(Float, nullable=True)    # sq meters
    status = Column(SAEnum(JobStatus), default=JobStatus.open)
    priority_score = Column(Float, default=0.0)
    deadline = Column(DateTime, nullable=True)
    assigned_contractor_id = Column(String, ForeignKey("contractors.id"), nullable=True)
    winning_bid_id = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_by_agent = Column(String(5), default="false")  # "true" if agent created
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    report_links = relationship("RepairJobReport", back_populates="job", cascade="all, delete-orphan")
    bids = relationship("Bid", back_populates="job", cascade="all, delete-orphan")
    progress_updates = relationship("RepairProgress", back_populates="job", cascade="all, delete-orphan")
    assigned_contractor = relationship("Contractor", foreign_keys=[assigned_contractor_id])
    creator = relationship("User", foreign_keys=[created_by])


class RepairJobReport(Base):
    """Many-to-many association between RepairJob and Report."""
    __tablename__ = "repair_job_reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String, ForeignKey("repair_jobs.id"), nullable=False)
    report_id = Column(String, ForeignKey("reports.id"), nullable=False)

    job = relationship("RepairJob", back_populates="report_links")
    report = relationship("Report", back_populates="job_reports")
