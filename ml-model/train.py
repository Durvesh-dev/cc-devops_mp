import csv
import json
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from feature_utils import log_to_features

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "dataset.csv"
MODEL_PATH = BASE_DIR / "model.pkl"


DEFAULT_LOGS = [
    "INFO service startup complete in 120ms",
    "INFO health probe passed in 40ms",
    "INFO api request completed status 200 latency 130ms",
    "INFO cache refresh completed in 80ms",
    "WARN external dependency latency 950ms",
    "INFO background job finished in 260ms",
    "INFO user session validated in 55ms",
    "WARN temporary retry for db connection in 420ms",
    "INFO autoscaler check completed with 2 nodes active",
    "INFO metrics push complete in 65ms",
]


def load_logs():
    if not DATASET_PATH.exists():
        return []

    logs = []
    with DATASET_PATH.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("log"):
                logs.append(row["log"])
    return logs


def append_log(log_message: str):
    file_exists = DATASET_PATH.exists()
    with DATASET_PATH.open("a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["log"])
        if not file_exists:
            writer.writeheader()
        writer.writerow({"log": log_message})


def seed_dataset_if_missing():
    if DATASET_PATH.exists():
        return

    with DATASET_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["log"])
        writer.writeheader()
        for log in DEFAULT_LOGS:
            writer.writerow({"log": log})


def train_model(logs):
    if len(logs) < 5:
        raise ValueError("Need at least 5 logs to train the model")

    features = np.vstack([log_to_features(log) for log in logs])
    model = IsolationForest(
        n_estimators=100,
        contamination=0.15,
        random_state=42,
    )
    model.fit(features)
    joblib.dump(model, MODEL_PATH)


if __name__ == "__main__":
    try:
        seed_dataset_if_missing()

        # Optional argument allows incremental local retraining from backend.
        incoming_log = sys.argv[1] if len(sys.argv) > 1 else None
        if incoming_log:
            append_log(incoming_log)

        all_logs = load_logs()
        train_model(all_logs)
        print(
            json.dumps(
                {
                    "ok": True,
                    "message": "Model trained",
                    "samples": len(all_logs),
                    "model_path": str(MODEL_PATH),
                }
            )
        )
    except Exception as exc:
        print(f"Training failed: {exc}", file=sys.stderr)
        raise
