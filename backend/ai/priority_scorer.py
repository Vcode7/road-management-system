"""
Priority Scorer
Calculates damage report priority score using:
priority = severity × traffic_density × road_importance
"""
from config import SEVERITY_WEIGHTS, ROAD_IMPORTANCE_WEIGHTS


def calculate_priority_score(severity: str, traffic_density: float, road_type: str) -> float:
    """
    Returns normalized priority score (0-10 scale).

    severity: low | medium | high | critical
    traffic_density: 1-5 float (1=low, 5=very high)
    road_type: local | arterial | highway
    """
    s = SEVERITY_WEIGHTS.get(severity, 1)
    r = ROAD_IMPORTANCE_WEIGHTS.get(road_type, 1)
    t = max(1.0, min(5.0, traffic_density))

    raw = s * t * r
    # Normalize: max possible = 4 * 5 * 3 = 60
    normalized = round((raw / 60.0) * 10.0, 2)
    return normalized


def rank_reports(reports: list) -> list:
    """Sort reports by priority score descending."""
    return sorted(reports, key=lambda r: r.priority_score, reverse=True)
