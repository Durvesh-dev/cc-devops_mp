import json
import os
import sys
from pathlib import Path

import joblib

BASE_DIR = Path(__file__).resolve().parent


def default_model_path():
    candidates = [
        BASE_DIR / "model" / "model.pkl",
        BASE_DIR / "models" / "model.pkl",
        BASE_DIR / "model.pkl",
    ]

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    return str(candidates[0])


MODEL_PATH = os.getenv("MODEL_PATH", default_model_path())


def load_model(path_str):
    model_path = Path(path_str)
    if not model_path.is_absolute():
        model_path = (BASE_DIR / model_path).resolve()

    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    return joblib.load(model_path)

def rule_based_check(text):
    text = text.lower()

    keywords = [
        "error", "fail", "failed", "failure",
        "exception", "timeout", "critical",
        "disconnect", "corrupt", "invalid",
        "denied", "refused", "unreachable"
    ]

    return 1 if any(k in text for k in keywords) else 0


def main():
    if len(sys.argv) < 2:
        raise ValueError("Missing log text argument")

    log_input = sys.argv[1]
    model = load_model(MODEL_PATH)

    ml_pred = int(model.predict([log_input])[0])
    rule_pred = int(rule_based_check(log_input))
    final_pred = 1 if (ml_pred == 1 or rule_pred == 1) else 0

    print(
        json.dumps(
            {
                "is_anomaly": bool(final_pred),
                "anomaly": final_pred,
                "anomaly_score": float(final_pred),
                "signals": {
                    "ml": ml_pred,
                    "rule": rule_pred,
                },
            }
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)