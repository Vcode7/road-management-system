"""
Batch Planner
Groups nearby reports into repair batches to minimize travel & maximize efficiency.
"""
from typing import List
from ai.duplicate_detector import haversine_m

BATCH_RADIUS_M = 300  # group potholes within 300m
MAX_BATCH_SIZE = 8


def plan_repair_batches(reports: list) -> List[List]:
    """
    Greedy spatial clustering: group reports within BATCH_RADIUS_M into batches.
    High-priority reports seed clusters.
    """
    if not reports:
        return []

    remaining = list(reports)
    batches = []

    while remaining:
        seed = remaining.pop(0)
        batch = [seed]

        still_remaining = []
        for r in remaining:
            if len(batch) >= MAX_BATCH_SIZE:
                still_remaining.append(r)
                continue
            dist = haversine_m(seed.latitude, seed.longitude, r.latitude, r.longitude)
            if dist <= BATCH_RADIUS_M:
                batch.append(r)
            else:
                still_remaining.append(r)

        remaining = still_remaining
        batches.append(batch)

    return batches
