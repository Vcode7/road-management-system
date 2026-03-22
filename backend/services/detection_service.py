"""
Detection Service
Orchestrates the full AI pipeline: preprocess → detect → classify → measure.
Also produces an annotated image with bounding boxes saved to uploads/processed/.
"""
import logging
import uuid
from pathlib import Path
from typing import Optional, List, Tuple

from ai.preprocessor import preprocess_image
from ai.damage_detector import detect_damage, save_annotated_image
from ai.severity_classifier import classify_severity
from ai.damage_measurer import measure_damage
from ai.repair_verifier import verify_repair

logger = logging.getLogger(__name__)


def run_detection_pipeline(image_path: str) -> dict:
    """
    Full AI detection pipeline.
    Returns structured detection result with bounding boxes, severity, etc.
    Also saves an annotated copy of the image to uploads/processed/ with
    bounding boxes drawn and damage labels.
    """
    from config import PROCESSED_UPLOAD_DIR

    # Step 1: Preprocess
    preprocessed = preprocess_image(image_path)
    if not preprocessed["is_valid"]:
        return {
            "success": False,
            "error": preprocessed.get("error", "Image preprocessing failed"),
            "detections": [],
            "annotated_image_path": None,
        }

    # Step 2: Detect damage
    raw_detections = detect_damage(preprocessed["processed_path"])

    # Step 3: Classify severity and measure for each detection
    enriched = []
    for det in raw_detections:
        severity = classify_severity(det)
        measurements = measure_damage(det)
        enriched.append({
            **det,
            "severity": severity,
            **measurements,
        })

    # Step 4: Aggregate overall severity
    if enriched:
        severity_order = ["low", "medium", "high", "critical"]
        overall_severity = max(
            enriched, key=lambda x: severity_order.index(x.get("severity", "low"))
        )["severity"]
    else:
        overall_severity = "low"

    # Step 5: Draw bounding boxes → save annotated image
    annotated_image_path = None
    try:
        output_filename = f"{uuid.uuid4()}.jpg"
        output_path = str(PROCESSED_UPLOAD_DIR / output_filename)
        save_annotated_image(preprocessed["processed_path"], enriched, output_path)
        annotated_image_path = output_path
        logger.info(f"Annotated image saved to {output_path}")
    except Exception as e:
        logger.warning(f"Could not save annotated image: {e}")

    return {
        "success": True,
        "detections": enriched,
        "overall_severity": overall_severity,
        "total_detections": len(enriched),
        "image_path": preprocessed["processed_path"],
        "blur_score": preprocessed.get("blur_score"),
        "annotated_image": annotated_image_path,   # NEW: path for dashboard/mobile
    }


def run_repair_verification(before_image: str, after_image: str) -> dict:
    """Compare before and after repair images."""
    return verify_repair(before_image, after_image)
