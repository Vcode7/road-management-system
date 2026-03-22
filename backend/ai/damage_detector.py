"""
Damage Detector
Uses YOLO for real detection; falls back to realistic mock inference.
"""
import os
import random
import logging
from typing import List, Dict, Any
from pathlib import Path

from config import YOLO_WEIGHTS_PATH, USE_REAL_MODEL
import cv2

logger = logging.getLogger(__name__)

DAMAGE_CLASSES = ["pothole", "transverse_crack", "alligator_crack", "other corruption", "longitudinal_crack"]

# Try loading real YOLO model
_model = None


def save_annotated_image(image_path: str, detections: List[Dict[str, Any]], output_path: str):
    image = cv2.imread(image_path)

    if image is None:
        raise ValueError(f"Could not read image: {image_path}")

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        label = f"{det['damage_type']} ({det['confidence']})"

        # Draw rectangle
        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 0, 255), 2)

        # Draw label background
        cv2.rectangle(image, (x1, y1 - 25), (x2, y1), (0, 0, 255), -1)

        # Put text
        cv2.putText(
            image,
            label,
            (x1 + 5, y1 - 5),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1,
            cv2.LINE_AA
        )

    cv2.imwrite(output_path, image)
def _load_model():
    global _model
    if _model is not None:
        return _model
    print(YOLO_WEIGHTS_PATH,Path(YOLO_WEIGHTS_PATH).exists())    
    if USE_REAL_MODEL and Path(YOLO_WEIGHTS_PATH).exists():
        try:
            from ultralytics import YOLO
            _model = YOLO(str(YOLO_WEIGHTS_PATH))
            logger.info("YOLO model loaded successfully")
            return _model
        except Exception as e:
            logger.warning(f"Could not load YOLO model: {e}")
    return None


def _mock_detect(image_path: str) -> List[Dict[str, Any]]:
    """Generate realistic mock detections for demo purposes."""
    random.seed(hash(image_path) % 1000)
    num_detections = random.randint(1, 3)
    detections = []

    for i in range(num_detections):
        damage_type = random.choice(DAMAGE_CLASSES)
        confidence = round(random.uniform(0.72, 0.97), 3)
        x1 = random.randint(50, 300)
        y1 = random.randint(50, 200)
        x2 = x1 + random.randint(80, 250)
        y2 = y1 + random.randint(60, 200)
        detections.append({
            "damage_type": damage_type,
            "confidence": confidence,
            "bbox": [x1, y1, x2, y2],
            "class_id": DAMAGE_CLASSES.index(damage_type),
        })
    return detections


def _real_detect(model, image_path: str) -> List[Dict[str, Any]]:
    """Run actual YOLO inference."""
    results = model(image_path, verbose=False)
    detections = []
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            detections.append({
                "damage_type": DAMAGE_CLASSES[cls_id] if cls_id < len(DAMAGE_CLASSES) else "unknown",
                "confidence": round(float(box.conf[0]), 3),
                "bbox": [round(x) for x in box.xyxy[0].tolist()],
                "class_id": cls_id,
            })
    output_path = image_path.replace(".", "_detected.")
    save_annotated_image(image_path, detections, output_path)        
    return detections


def detect_damage(image_path: str) -> List[Dict[str, Any]]:
    """Detect road damage in the given image."""
    model = _load_model()
    if model is not None:
        return _real_detect(model, image_path)
    else:
        logger.info("Using mock damage detection")
        return _mock_detect(image_path)
