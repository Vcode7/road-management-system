from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from math import radians, cos, sin, asin, sqrt

from models.report import Report, ReportStatus, DamageType, SeverityLevel, Damage
from ai.priority_scorer import calculate_priority_score
from ai.duplicate_detector import find_duplicate_report


def get_reports(db: Session, user_id: Optional[str] = None,
                role: Optional[str] = None, status: Optional[str] = None,
                damage_type: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Report]:
    query = db.query(Report)
    if role == "citizen" and user_id:
        query = query.filter(Report.user_id == user_id)
    if status:
        query = query.filter(Report.status == status)
    if damage_type:
        query = query.filter(Report.damage_type == damage_type)
    return query.order_by(Report.created_at.desc()).offset(offset).limit(limit).all()


def get_report_by_id(db: Session, report_id: str) -> Optional[Report]:
    return db.query(Report).filter(Report.id == report_id).first()


def create_report(db: Session, user_id: str, latitude: float, longitude: float,
                  damage_type: str, severity: Optional[str], description: Optional[str],
                  image_urls: List[str], ai_detection_result: Optional[dict] = None,
                  road_name: Optional[str] = None, road_type: str = "local",
                  traffic_density: float = 1.0,
                  processed_image_urls: Optional[List[str]] = None) -> Report:
    # Check for duplicate
    existing_reports = db.query(Report).filter(
        Report.status.notin_([ReportStatus.rejected, ReportStatus.duplicate])
    ).all()
    duplicate_id = find_duplicate_report(latitude, longitude, existing_reports)

    priority = calculate_priority_score(severity or "low", traffic_density, road_type)

    report = Report(
        user_id=user_id,
        latitude=latitude,
        longitude=longitude,
        road_name=road_name,
        road_type=road_type,
        damage_type=damage_type,
        severity=severity,
        description=description,
        image_urls=image_urls,
        processed_image_urls=processed_image_urls or [],
        ai_detection_result=ai_detection_result,
        priority_score=priority,
        traffic_density=traffic_density,
        is_duplicate=duplicate_id,
        status=ReportStatus.duplicate if duplicate_id else ReportStatus.submitted,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Create Damage records from AI detection
    if ai_detection_result and ai_detection_result.get("detections"):
        for det in ai_detection_result["detections"]:
            dmg = Damage(
                report_id=report.id,
                damage_type=det.get("damage_type", DamageType.unknown),
                bbox=det.get("bbox"),
                confidence=det.get("confidence", 0.0),
                width_estimate=det.get("width_cm"),
                area_estimate=det.get("area_cm2"),
                crack_length=det.get("crack_length_cm"),
                severity=det.get("severity"),
            )
            db.add(dmg)
        db.commit()

    # Snap to road and persist road segment (non-blocking on failure)
    try:
        from services.road_snap_service import attach_road_segment_to_report, copy_road_segment_from_original
        if duplicate_id:
            # Reuse the parent's road segment — no API call needed
            snapped = copy_road_segment_from_original(db, duplicate_id, report.id)
        else:
            snapped = attach_road_segment_to_report(db, report.id, latitude, longitude)

        # Persist snapped coordinates back onto the report row
        if snapped:
            report.snapped_lat, report.snapped_lng = snapped
            db.commit()
            db.refresh(report)
    except Exception as snap_err:
        import logging
        logging.getLogger(__name__).warning(f"Road snap skipped: {snap_err}")

    return report


def update_report_status(db: Session, report_id: str, status: str,
                          updated_by: Optional[str] = None) -> Optional[Report]:
    report = db.query(Report).filter(Report.id == report_id).first()
    if report:
        report.status = status
        db.commit()
        db.refresh(report)
    return report


def get_nearby_reports(db: Session, lat: float, lng: float, radius_km: float = 2.0) -> List[Report]:
    """Return reports within radius_km of the given coordinates."""
    reports = db.query(Report).filter(
        Report.status.notin_([ReportStatus.rejected, ReportStatus.duplicate, ReportStatus.completed])
    ).all()

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        return 2 * R * asin(sqrt(a))

    return [r for r in reports if haversine(lat, lng, r.latitude, r.longitude) <= radius_km]
