import json
import os
import re
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


def clean_text(text):
    """
    Matches the pre-processing logic from the Google Colab training notebook.
    Strips noise (timestamps, IDs) so the TF-IDF vectorizer sees only semantic text.
    """
    text = str(text).lower()
    # Remove digits (timestamps, IP addresses, etc.)
    text = re.sub(r"\d+", "", text)
    # Remove any character that isn't a letter or space (brackets, colons, -)
    text = re.sub(r"[^a-z\s]", "", text)
    return " ".join(text.split())


def rule_based_check(text):
    # This signal is kept for the dashboard but ignored in final_pred
    text = text.lower()
    keywords = [
        "error", "fail", "failed", "failure",
        "exception", "timeout", "critical",
        "disconnect", "corrupt", "invalid",
        "denied", "refused", "unreachable"
    ]
    return 1 if any(k in text for k in keywords) else 0


def normalize_model_prediction(raw_pred):
    """
    Normalize model outputs to anomaly label: 1=anomaly, 0=normal.
    Supports both:
    - IsolationForest style: -1 anomaly, 1 normal
    - Binary classifier style: 1 anomaly, 0 normal
    """
    pred = int(raw_pred)

    if pred in (-1, 1):
        return (1 if pred == -1 else 0), "isolation_forest"

    if pred in (0, 1):
        return pred, "binary_classifier"

    # Fallback safety: treat non-zero as anomaly.
    return (1 if pred != 0 else 0), "unknown"


def get_anomaly_score(model, cleaned_input, normalized_pred):
    """
    Produce a comparable anomaly score in [0, 1] when possible.
    """
    try:
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba([cleaned_input])
            if proba is not None and len(proba) and len(proba[0]) >= 2:
                return float(proba[0][1])
    except Exception:
        pass

    return float(normalized_pred)


def main():
    if len(sys.argv) < 2:
        raise ValueError("Missing log text argument")

    log_input = sys.argv[1]
    
    # 1. Load the pre-trained model pipeline
    model = load_model(MODEL_PATH)

    # 2. Pre-process the input (removing timestamps and noise)
    cleaned_input = clean_text(log_input)
    
    if not cleaned_input:
        cleaned_input = "null"

    # 3. Predict using ML model and normalize output label format
    raw_pred = model.predict([cleaned_input])[0]
    ml_pred, model_type = normalize_model_prediction(raw_pred)
    
    # 4. Secondary rule-based signal (for dashboard metadata)
    rule_pred = int(rule_based_check(log_input))

    # FINAL DECISION: ML + optional rule fallback (enabled by default)
    use_rule_fallback = os.getenv("USE_RULE_FALLBACK", "true").strip().lower() in {"1", "true", "yes", "on"}
    final_pred = 1 if (ml_pred == 1 or (use_rule_fallback and rule_pred == 1)) else 0
    anomaly_score = get_anomaly_score(model, cleaned_input, final_pred)

    print(
        json.dumps(
            {
                "is_anomaly": bool(final_pred),
                "anomaly": final_pred,
                "anomaly_score": anomaly_score,
                "cleaned_text": cleaned_input,
                "signals": {
                    "ml": ml_pred,
                    "rule": rule_pred,
                    "model_type": model_type,
                    "use_rule_fallback": use_rule_fallback,
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