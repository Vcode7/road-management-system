"""
Road Segment Models

road_segments  — stores pre-computed polylines snapped to real roads
report_road_map — maps reports → road segments (many-to-many via junction)
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, JSON, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from database.connection import Base


class RoadSegment(Base):
    __tablename__ = "road_segments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    polyline = Column(JSON, nullable=False)        # List of {lat, lng} dicts
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    report_maps = relationship("ReportRoadMap", back_populates="road_segment", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_road_segments_center_lat", "center_lat"),
        Index("ix_road_segments_center_lng", "center_lng"),
    )


class ReportRoadMap(Base):
    __tablename__ = "report_road_map"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    road_segment_id = Column(String, ForeignKey("road_segments.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    report = relationship("Report", back_populates="road_maps")
    road_segment = relationship("RoadSegment", back_populates="report_maps")
