"""
Agent Prioritizer
Ranks pending reports by priority score.
"""
from typing import List
from ai.priority_scorer import calculate_priority_score


def prioritize_reports(reports: list) -> List:
    """
    Re-calculate and sort reports by priority.
    Updates priority_score in memory (caller persists if needed).
    """
    for r in reports:
        r.priority_score = calculate_priority_score(
            severity=r.severity or "low",
            traffic_density=r.traffic_density or 1.0,
            road_type=r.road_type or "local",
        )
    return sorted(reports, key=lambda r: r.priority_score, reverse=True)
