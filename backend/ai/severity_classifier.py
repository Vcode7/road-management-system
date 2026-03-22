"""
Severity Classifier
Maps detection bounding box size and damage type to severity level.
"""
from typing import Dict, Any


SEVERITY_RULES = {
    "other corruption": "critical",
    "alligator_crack": "high",
    "transverse_crack": "low",
    "pothole": None,    # determined by size
    "longitudinal_crack": "medium",      # determined by size
}


def classify_severity(detection: Dict[str, Any]) -> str:
    """
    Classify damage severity as: low | medium | high | critical
    Based on type and bbox area.
    """
    damage_type = detection.get("damage_type", "pothole")
    bbox = detection.get("bbox", [0, 0, 100, 100])
    confidence = detection.get("confidence", 0.5)

    # Type-based classification
    if damage_type in SEVERITY_RULES and SEVERITY_RULES[damage_type]:
        return SEVERITY_RULES[damage_type]

    # Area-based classification
    x1, y1, x2, y2 = bbox
    area = abs(x2 - x1) * abs(y2 - y1)

    # In 640x640 image: 640*640 = 409600 total pixels
    area_ratio = area / 409600

    if area_ratio > 0.15:
        base = "critical"
    elif area_ratio > 0.08:
        base = "high"
    elif area_ratio > 0.03:
        base = "medium"
    else:
        base = "low"

    # Confidence modifier
    if confidence < 0.75 and base == "critical":
        base = "high"

    return base
