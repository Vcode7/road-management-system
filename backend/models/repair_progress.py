import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, Enum as SAEnum, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from database.connection import Base
import enum


class RepairStage(str, enum.Enum):
    assigned = "assigned"
    materials_ready = "materials_ready"
    repair_started = "repair_started"
    repair_completed = "repair_completed"
    inspection_pending = "inspection_pending"
    verified = "verified"
    rejected = "rejected"


class RepairProgress(Base):
    __tablename__ = "repair_progress"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String, ForeignKey("repair_jobs.id"), nullable=False)
    stage = Column(SAEnum(RepairStage), nullable=False)
    images = Column(JSON, default=list)      # ['before.jpg', 'wip.jpg', 'after.jpg']
    notes = Column(Text, nullable=True)
    reported_by = Column(String, ForeignKey("users.id"), nullable=True)
    quality_score = Column(Float, nullable=True)     # Set during AI verification
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    job = relationship("RepairJob", back_populates="progress_updates")
