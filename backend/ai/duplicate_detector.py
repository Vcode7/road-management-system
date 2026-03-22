"""
Duplicate Detector
Detects duplicate damage reports based on geographic proximity.
Two reports within DUPLICATE_RADIUS_M are considered duplicates.
"""
from typing import List, Optional
from math import radians, cos, sin, asin, sqrt


DUPLICATE_RADIUS_M = 50  # 50 meter radius


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in meters between two coordinates."""
    R = 6371000  # Earth radius in meters
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * R * asin(sqrt(a))


def find_duplicate_report(latitude: float, longitude: float, existing_reports: list) -> Optional[str]:
    """
    Check if there's an existing recent report within DUPLICATE_RADIUS_M.
    Returns the ID of the duplicate if found, None otherwise.
    """
    for report in existing_reports:
        distance = haversine_m(latitude, longitude, report.latitude, report.longitude)
        if distance <= DUPLICATE_RADIUS_M:
            return report.id
    return None


def cluster_nearby_reports(reports: list, radius_m: float = 200) -> List[List[str]]:
    """
    Group reports that are within radius_m of each other into clusters.
    Uses simple greedy clustering for repair batch planning.
    Returns list of clusters, each being a list of report IDs.
    """
    if not reports:
        return []

    unclustered = list(reports)
    clusters = []

    while unclustered:
        seed = unclustered.pop(0)
        cluster = [seed]

        remaining = []
        for r in unclustered:
            dist = haversine_m(seed.latitude, seed.longitude, r.latitude, r.longitude)
            if dist <= radius_m:
                cluster.append(r)
            else:
                remaining.append(r)

        unclustered = remaining
        clusters.append([r.id for r in cluster])

    return clusters
