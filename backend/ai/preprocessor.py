"""
Image Preprocessor
Handles blur detection, resizing, and normalization.
"""
import os
import shutil
from pathlib import Path
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    logger.warning("OpenCV not available — using mock preprocessing")


def detect_blur(image_path: str) -> float:
    """Return blur score (higher = sharper). Uses Laplacian variance."""
    if not CV2_AVAILABLE:
        return 150.0  # Mock: good quality

    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 0.0
        return float(cv2.Laplacian(img, cv2.CV_64F).var())
    except Exception as e:
        logger.error(f"Blur detection error: {e}")
        return 0.0


def preprocess_image(image_path: str, target_size: tuple = (640, 640)) -> Dict[str, Any]:
    """
    Full preprocessing pipeline:
    1. Validate file exists
    2. Blur detection
    3. Resize to target size
    4. Return preprocessed result
    """
    if not os.path.exists(image_path):
        return {"is_valid": False, "error": "Image file not found"}

    blur_score = detect_blur(image_path)
    BLUR_THRESHOLD = 20.0

    if blur_score < BLUR_THRESHOLD and blur_score > 0:
        logger.warning(f"Image {image_path} is blurry (score={blur_score:.1f})")

    if not CV2_AVAILABLE:
        return {
            "is_valid": True,
            "processed_path": image_path,
            "blur_score": 150.0,
            "is_blurry": False,
            "original_size": (1280, 720),
            "processed_size": target_size,
        }

    try:
        img = cv2.imread(image_path)
        if img is None:
            return {"is_valid": False, "error": "Could not read image"}

        original_size = (img.shape[1], img.shape[0])
        resized = cv2.resize(img, target_size)

        # Save preprocessed image
        out_path = str(Path(image_path).parent / f"prep_{Path(image_path).name}")
        cv2.imwrite(out_path, resized)

        return {
            "is_valid": True,
            "processed_path": out_path,
            "blur_score": round(blur_score, 2),
            "is_blurry": blur_score < BLUR_THRESHOLD,
            "original_size": original_size,
            "processed_size": target_size,
        }
    except Exception as e:
        logger.error(f"Preprocessing failed: {e}")
        return {"is_valid": False, "error": str(e)}
