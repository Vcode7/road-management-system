# AI Models

This directory is for YOLO model weights and AI configuration.

## Setup

1. Train a YOLOv8 model on road damage data (e.g., RDD2022 dataset)
2. Place the trained weights at: `weights/best.pt`
3. Set `USE_REAL_MODEL=true` in your environment

## Mock Mode (Default)

By default, the system runs with mock inference that returns realistic sample detections. This allows full end-to-end testing without requiring GPU or trained models.

## Supported Damage Types

- `pothole` — circular/oval depressions in road surface
- `crack` — longitudinal or transverse cracks
- `alligator_crack` — interconnected crack network
- `road_collapse` — severe structural failure
- `rutting` — surface deformation from traffic
- `bleeding` — excess asphalt binder on surface

## Model Architecture

- **Detection**: YOLOv8n/s (Ultralytics)
- **Input**: 640×640 RGB image
- **Output**: bounding boxes + class + confidence
- **Severity**: Rule-based classifier using damage type + area ratio
- **Measurement**: Pixel-to-cm conversion with assumed camera parameters

## Dataset Resources

- [RDD2022](https://github.com/sekilab/RoadDamageDetector) - Road Damage Detection Dataset
- [CRDDC2022](https://crddc2022.sekilab.global/) - Crowdsensing Road Damage Detection Challenge
