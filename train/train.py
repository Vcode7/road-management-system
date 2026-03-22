from ultralytics import YOLO
import torch

def main():
    model = YOLO(r"E:\projects\sadak-kadak\train\best (13).pt")

    model.train(
        data="data.yaml",
        epochs=30,
        imgsz=640,
        batch=8,
        device=0,
workers=0,
        # important
        pretrained=True,
        freeze=10,

        augment=True,

        project="road-damage",
        name="retrain_final"
    )

if __name__ == "__main__":
    main()