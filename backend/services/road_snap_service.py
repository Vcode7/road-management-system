"""
Road Snapping Service

Uses Google Roads API to snap report location to the nearest road
and compute a polyline representing the road segment.
Falls back gracefully if the API key is missing or call fails.
"""
SNAP_RESPONSES = [

# 1
{'snappedPoints': [
{'location': {'latitude': 17.658902023308514, 'longitude': 75.90620041867517}},
{'location': {'latitude': 17.6588159, 'longitude': 75.9066588}},
{'location': {'latitude': 17.6587221, 'longitude': 75.906671}},
{'location': {'latitude': 17.6586772, 'longitude': 75.9071427}},
{'location': {'latitude': 17.658892899999998, 'longitude': 75.9071635}},
{'location': {'latitude': 17.6594768, 'longitude': 75.9072115}},
{'location': {'latitude': 17.6594806, 'longitude': 75.9071652}},
{'location': {'latitude': 17.659486276472435, 'longitude': 75.90679976523374}}
]},

# 2
{'snappedPoints': [
{'location': {'latitude': 17.6601121105963, 'longitude': 75.90706000162184}},
{'location': {'latitude': 17.66003607822773, 'longitude': 75.90746893615879}},
{'location': {'latitude': 17.6599143, 'longitude': 75.9083089}},
{'location': {'latitude': 17.6598242, 'longitude': 75.9089149}},
{'location': {'latitude': 17.660096899999996, 'longitude': 75.9089746}},
{'location': {'latitude': 17.6605451, 'longitude': 75.9090337}},
{'location': {'latitude': 17.660628100000004, 'longitude': 75.90875609999999}},
{'location': {'latitude': 17.661011418294464, 'longitude': 75.90840265791182}}
]},

# 3
{'snappedPoints': [
{'location': {'latitude': 17.66968569150392, 'longitude': 75.911841568395}},
{'location': {'latitude': 17.6696256, 'longitude': 75.9120969}},
{'location': {'latitude': 17.669916999999998, 'longitude': 75.9122385}},
{'location': {'latitude': 17.670004199999994, 'longitude': 75.9122515}},
{'location': {'latitude': 17.670307599999997, 'longitude': 75.9123168}},
{'location': {'latitude': 17.6702854, 'longitude': 75.91241939999999}},
{'location': {'latitude': 17.6702261, 'longitude': 75.91276069999999}},
{'location': {'latitude': 17.670870099999995, 'longitude': 75.9131735}}
]},

# 4
{'snappedPoints': [
{'location': {'latitude': 17.671171177444748, 'longitude': 75.91261204503094}},
{'location': {'latitude': 17.671257800000003, 'longitude': 75.91284759999999}},
{'location': {'latitude': 17.671305399999998, 'longitude': 75.9131136}},
{'location': {'latitude': 17.671647999999998, 'longitude': 75.9129952}},
{'location': {'latitude': 17.671690899999998, 'longitude': 75.913192}},
{'location': {'latitude': 17.671720200000003, 'longitude': 75.9133916}},
{'location': {'latitude': 17.672018200000004, 'longitude': 75.9135036}},
{'location': {'latitude': 17.67241248915083, 'longitude': 75.91369564042556}}
]},

# 5
{'snappedPoints': [
{'location': {'latitude': 17.64785476882624, 'longitude': 75.89033335038201}},
{'location': {'latitude': 17.6481414, 'longitude': 75.8904269}},
{'location': {'latitude': 17.6484022, 'longitude': 75.8905034}},
{'location': {'latitude': 17.648345955742585, 'longitude': 75.89076328755402}},
{'location': {'latitude': 17.6482676, 'longitude': 75.8910928}},
{'location': {'latitude': 17.648571999999994, 'longitude': 75.89117829999999}},
{'location': {'latitude': 17.648914299999998, 'longitude': 75.8912383}},
{'location': {'latitude': 17.649121179220515, 'longitude': 75.89127777773058}}
]},

# 6
{'snappedPoints': [
{'location': {'latitude': 17.64716815279435, 'longitude': 75.88895321623119}},
{'location': {'latitude': 17.6473657, 'longitude': 75.8887539}},
{'location': {'latitude': 17.647464799999998, 'longitude': 75.8885379}},
{'location': {'latitude': 17.6480228, 'longitude': 75.88900269999999}},
{'location': {'latitude': 17.647859599999997, 'longitude': 75.8892293}},
{'location': {'latitude': 17.64781355028017, 'longitude': 75.88950251503036}},
{'location': {'latitude': 17.6482068, 'longitude': 75.8900795}},
{'location': {'latitude': 17.648391760025202, 'longitude': 75.89013198021313}}
]},

# 7
{'snappedPoints': [
{'location': {'latitude': 17.6752515, 'longitude': 75.92378819999999}},
{'location': {'latitude': 17.6753097, 'longitude': 75.92384919999999}},
{'location': {'latitude': 17.6754469, 'longitude': 75.9239206}},
{'location': {'latitude': 17.6754966, 'longitude': 75.9241218}},
{'location': {'latitude': 17.675488299999998, 'longitude': 75.9243103}},
{'location': {'latitude': 17.675543799999996, 'longitude': 75.9244008}},
{'location': {'latitude': 17.6762704, 'longitude': 75.9245607}},
{'location': {'latitude': 17.6764667, 'longitude': 75.9247937}}
]},

# 8
{'snappedPoints': [
{'location': {'latitude': 17.6750875, 'longitude': 75.92527230000002}},
{'location': {'latitude': 17.6749618, 'longitude': 75.92528209999999}},
{'location': {'latitude': 17.6748115, 'longitude': 75.92527199999999}},
{'location': {'latitude': 17.6747153, 'longitude': 75.9252326}},
{'location': {'latitude': 17.6745806, 'longitude': 75.9251735}},
{'location': {'latitude': 17.6746733, 'longitude': 75.9254}},
{'location': {'latitude': 17.6747211, 'longitude': 75.92558199999999}},
{'location': {'latitude': 17.6765236, 'longitude': 75.928282}}
]},

# 9
{'snappedPoints': [
{'location': {'latitude': 17.662960682310636, 'longitude': 75.91508386965594}},
{'location': {'latitude': 17.6628014, 'longitude': 75.9152319}},
{'location': {'latitude': 17.6628584, 'longitude': 75.9154077}},
{'location': {'latitude': 17.6629957, 'longitude': 75.9158504}},
{'location': {'latitude': 17.6634458, 'longitude': 75.9157027}},
{'location': {'latitude': 17.663608699999997, 'longitude': 75.9161918}},
{'location': {'latitude': 17.663937846904908, 'longitude': 75.91589913827706}}
]},

# 10
{'snappedPoints': [
{'location': {'latitude': 17.662057585734868, 'longitude': 75.91360581216959}},
{'location': {'latitude': 17.662073799999998, 'longitude': 75.9140434}},
{'location': {'latitude': 17.662443099999997, 'longitude': 75.9140153}},
{'location': {'latitude': 17.6624826, 'longitude': 75.9142207}},
{'location': {'latitude': 17.662503648005618, 'longitude': 75.91429387955685}},
{'location': {'latitude': 17.6625983, 'longitude': 75.91467519999999}},
{'location': {'latitude': 17.663362, 'longitude': 75.9144993}},
{'location': {'latitude': 17.663433709677378, 'longitude': 75.91479086862687}}
]}

]
DEMO_MODE = True

import os
import logging
import math
from typing import Optional, Tuple
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def add_snapped_columns_if_missing():
    """
    SQLite ALTER TABLE migration: safely add snapped_lat, snapped_lng, and
    processed_image_urls to the reports table if they don't already exist.
    Called once at startup so existing databases are upgraded automatically.
    """
    import sqlalchemy
    from database.connection import engine
    with engine.connect() as conn:
        cols = [row[1] for row in conn.execute(
            sqlalchemy.text("PRAGMA table_info(reports)")
        )]
        new_cols = [
            ("snapped_lat",          "REAL"),
            ("snapped_lng",          "REAL"),
            ("processed_image_urls", "TEXT"),
        ]
        for col, col_type in new_cols:
            if col not in cols:
                conn.execute(sqlalchemy.text(
                    f"ALTER TABLE reports ADD COLUMN {col} {col_type}"
                ))
                logger.info(f"Migration: added column reports.{col}")
        conn.commit()


def _haversine_deg(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return approximate distance in degrees (for fast dedup checks)."""
    return math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2)

_snap_index = 0
def snap_to_roads(lat: float, lng: float) -> list:
    """
    Call Google Roads snapToRoads API to get a road-following polyline
    centered on the given coordinate.

    Returns a list of {lat, lng} dicts.
    Falls back to a short straight-line segment if API fails.
    """
    global _snap_index
    if DEMO_MODE:
        print("DEMO MODE")
        if _snap_index < len(SNAP_RESPONSES):
            snap_data = SNAP_RESPONSES[_snap_index]
            _snap_index += 1
            print("DEMO MODE")
            return [
                {"lat": p["location"]["latitude"], "lng": p["location"]["longitude"]}
                for p in snap_data["snappedPoints"]
            ]

        # fallback if overflow
        return _fallback_polyline(lat, lng)
    
    from config import GOOGLE_ROADS_API_KEY
    import urllib.request
    import json

    offset = 0.0006  # ~66m, enough to get meaningful road shape

    if not GOOGLE_ROADS_API_KEY:
        logger.debug("No GOOGLE_ROADS_API_KEY — using fallback polyline.")
        return _fallback_polyline(lat, lng)

    path_points = [
        f"{lat - offset},{lng - offset}",
        f"{lat},{lng}",
        f"{lat + offset},{lng + offset}",
    ]
    path_str = "|".join(path_points)
    url = (
        f"https://roads.googleapis.com/v1/snapToRoads"
        f"?path={path_str}&interpolate=true&key={GOOGLE_ROADS_API_KEY}"
    )

    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read())
        print(data)    
        snapped = data.get("snappedPoints", [])
        if len(snapped) >= 2:
            return [
                {"lat": p["location"]["latitude"], "lng": p["location"]["longitude"]}
                for p in snapped
            ]
        logger.warning("snapToRoads returned < 2 points; using fallback.")
    except Exception as e:
        logger.warning(f"snapToRoads API error: {e}; using fallback.")

    return _fallback_polyline(lat, lng)


def _fallback_polyline(lat: float, lng: float) -> list:
    """Simple 2-point fallback centered on the report location."""
    offset = 0.0005
    return [
        {"lat": lat - offset, "lng": lng},
        {"lat": lat + offset, "lng": lng},
    ]


def find_or_create_road_segment(db: Session, polyline: list, center_lat: float, center_lng: float):
    """
    Deduplication: reuse an existing segment if one is within ~55m (~0.0005 deg).
    Otherwise create a new RoadSegment row.
    """
    from models.road_segment import RoadSegment

    DEDUP_THRESHOLD = 0.0005

    # Bounding-box pre-filter to avoid full table scan
    candidates = db.query(RoadSegment).filter(
        RoadSegment.center_lat.between(center_lat - DEDUP_THRESHOLD, center_lat + DEDUP_THRESHOLD),
        RoadSegment.center_lng.between(center_lng - DEDUP_THRESHOLD, center_lng + DEDUP_THRESHOLD),
    ).all()

    for candidate in candidates:
        dist = _haversine_deg(center_lat, center_lng, candidate.center_lat, candidate.center_lng)
        if dist <= DEDUP_THRESHOLD:
            logger.debug(f"Reusing road segment {candidate.id}")
            return candidate

    # Create new segment
    segment = RoadSegment(
        polyline=polyline,
        center_lat=center_lat,
        center_lng=center_lng,
    )
    db.add(segment)
    db.flush()  # Get ID before commit
    logger.info(f"Created new road segment {segment.id}")
    return segment


def attach_road_segment_to_report(
    db: Session, report_id: str, lat: float, lng: float
) -> Optional[Tuple[float, float]]:
    """
    Full pipeline: snap → deduplicate → create mapping entry.
    Returns (snapped_center_lat, snapped_center_lng) on success, None on failure.
    Wrapped so any failure never breaks report submission.
    """
    from models.road_segment import ReportRoadMap

    try:
        polyline = snap_to_roads(lat, lng)
        center_lat = sum(p["lat"] for p in polyline) / len(polyline)
        center_lng = sum(p["lng"] for p in polyline) / len(polyline)

        segment = find_or_create_road_segment(db, polyline, center_lat, center_lng)

        # Check if mapping already exists (idempotent)
        existing = db.query(ReportRoadMap).filter_by(
            report_id=report_id,
            road_segment_id=segment.id,
        ).first()

        if not existing:
            mapping = ReportRoadMap(report_id=report_id, road_segment_id=segment.id)
            db.add(mapping)

        db.commit()
        logger.info(f"Road segment {segment.id} attached to report {report_id}")
        return (center_lat, center_lng)
    except Exception as e:
        logger.error(f"Road snapping pipeline failed for report {report_id}: {e}")
        db.rollback()
        return None


def copy_road_segment_from_original(
    db: Session, original_report_id: str, duplicate_report_id: str
) -> Optional[Tuple[float, float]]:
    """
    For duplicate reports: instead of calling the Roads API again, reuse the
    road segment that is already attached to the original/parent report.
    Returns (snapped_center_lat, snapped_center_lng) if the original had one.
    """
    from models.road_segment import ReportRoadMap

    try:
        original_mapping = db.query(ReportRoadMap).filter_by(
            report_id=original_report_id
        ).first()

        if not original_mapping:
            logger.warning(
                f"Original report {original_report_id} has no road segment yet; "
                "skipping road-segment copy for duplicate."
            )
            return None

        # Link duplicate to the same segment (idempotent)
        existing = db.query(ReportRoadMap).filter_by(
            report_id=duplicate_report_id,
            road_segment_id=original_mapping.road_segment_id,
        ).first()

        if not existing:
            db.add(ReportRoadMap(
                report_id=duplicate_report_id,
                road_segment_id=original_mapping.road_segment_id,
            ))

        segment = original_mapping.road_segment
        db.commit()
        logger.info(
            f"Duplicate report {duplicate_report_id} re-linked to segment "
            f"{original_mapping.road_segment_id} from original {original_report_id}"
        )
        return (segment.center_lat, segment.center_lng)
    except Exception as e:
        logger.error(f"Road segment copy failed for duplicate {duplicate_report_id}: {e}")
        db.rollback()
        return None
