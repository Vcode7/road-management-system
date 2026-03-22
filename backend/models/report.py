import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, JSON, Enum as SAEnum, ForeignKey, Integer
from sqlalchemy.orm import relationship
from database.connection import Base
import enum


class ReportStatus(str, enum.Enum):
    submitted = "submitted"
    verified = "verified"
    scheduled = "scheduled"
    repairing = "repairing"
    completed = "completed"
    rejected = "rejected"
    duplicate = "duplicate"


class DamageType(str, enum.Enum):
    pothole = "pothole"
    alligator_crack = "alligator_crack"
    transverse_crack = "transverse_crack"
    longitudinal_crack = "longitudinal_crack"
    other_corruption = "other corruption"
    unknown = "unknown"


class SeverityLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    image_urls = Column(JSON, default=list)       # List of image paths
    video_url = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)         # Raw GPS submitted by user
    longitude = Column(Float, nullable=False)        # Raw GPS submitted by user
    snapped_lat = Column(Float, nullable=True)       # Closest point on snapped road polyline
    snapped_lng = Column(Float, nullable=True)       # Closest point on snapped road polyline
    address = Column(String(500), nullable=True)
    road_name = Column(String(255), nullable=True)
    road_type = Column(String(50), default="local")  # local, arterial, highway
    damage_type = Column(SAEnum(DamageType), nullable=False, default=DamageType.unknown)
    severity = Column(SAEnum(SeverityLevel), nullable=True)
    status = Column(SAEnum(ReportStatus), default=ReportStatus.submitted)
    priority_score = Column(Float, default=0.0)
    description = Column(String(1000), nullable=True)
    ai_detection_result = Column(JSON, nullable=True)   # Raw AI output
    traffic_density = Column(Float, default=1.0)        # 1-5 scale
    is_duplicate = Column(String, nullable=True)        # ID of original if duplicate
    processed_image_urls = Column(JSON, default=list)   # AI-annotated images with bboxes
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="reports")
    damages = relationship("Damage", back_populates="report", cascade="all, delete-orphan")
    job_reports = relationship("RepairJobReport", back_populates="report")
    road_maps = relationship("ReportRoadMap", back_populates="report", cascade="all, delete-orphan")


class Damage(Base):
    __tablename__ = "damages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String, ForeignKey("reports.id"), nullable=False)
    damage_type = Column(SAEnum(DamageType), nullable=False)
    bbox = Column(JSON, nullable=True)              # [x1, y1, x2, y2]
    confidence = Column(Float, default=0.0)
    width_estimate = Column(Float, nullable=True)   # cm
    area_estimate = Column(Float, nullable=True)    # cm²
    crack_length = Column(Float, nullable=True)     # cm
    severity = Column(SAEnum(SeverityLevel), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="damages")
