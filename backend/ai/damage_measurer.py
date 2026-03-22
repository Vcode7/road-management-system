"""
Damage Measurer
Estimates physical dimensions of damage from bounding box coordinates.
Assumes image represents approx. 3m x 3m real-world area at typical road camera height.
"""
from typing import Dict, Any
import math

# Calibration: assume 640px image = 3.0m roadway width
IMAGE_WIDTH_PX = 640
REAL_WIDTH_M = 3.0
PX_PER_M = IMAGE_WIDTH_PX / REAL_WIDTH_M   # ~213 px/m
PX_PER_CM = PX_PER_M / 100                 # ~2.13 px/cm


def measure_damage(detection: Dict[str, Any]) -> Dict[str, float]:
    """
    Estimate width, area, and crack length from bounding box.
    Returns measurements in centimeters / cm².
    """
    bbox = detection.get("bbox", [0, 0, 100, 100])
    damage_type = detection.get("damage_type", "pothole")

    x1, y1, x2, y2 = bbox
    width_px = abs(x2 - x1)
    height_px = abs(y2 - y1)

    width_cm = round(width_px / PX_PER_CM, 1)
    height_cm = round(height_px / PX_PER_CM, 1)
    area_cm2 = round(width_cm * height_cm, 1)

    # Crack length estimate (diagonal of bbox for linear cracks)
    crack_length_cm = None
    if damage_type in ("transverse crack", "alligator_crack"):
        diagonal_px = math.sqrt(width_px ** 2 + height_px ** 2)
        crack_length_cm = round(diagonal_px / PX_PER_CM, 1)

    return {
        "width_cm": width_cm,
        "height_cm": height_cm,
        "area_cm2": area_cm2,
        "crack_length_cm": crack_length_cm,
    }
