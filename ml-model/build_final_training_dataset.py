import argparse
import csv
import json
import re
from pathlib import Path

KEYWORDS = {
    "error",
    "fail",
    "failed",
    "failure",
    "exception",
    "timeout",
    "critical",
    "disconnect",
    "corrupt",
    "invalid",
    "denied",
    "refused",
    "unreachable",
    "crash",
}


def clean_text(text: str) -> str:
    text = str(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def derive_label(text: str) -> int:
    t = str(text).lower()
    return 1 if any(k in t for k in KEYWORDS) else 0


def load_runtime_logs(logs_jsonl_path: Path):
    rows = []
    if not logs_jsonl_path.exists():
        return rows

    with logs_jsonl_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue

            content = clean_text(item.get("log") or "")
            if not content:
                continue

            service = item.get("service") or "unknown-service"
            level = item.get("level") or "INFO"
            label = derive_label(content)
            rows.append({"Content": content, "label": label, "service": service, "level": level})

    return rows


def load_synthetic_dataset(csv_path: Path):
    rows = []
    if not csv_path.exists():
        return rows

    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            content = clean_text(row.get("Content") or row.get("log") or row.get("message") or "")
            if not content:
                continue

            raw_label = row.get("label")
            if raw_label in ("0", "1"):
                label = int(raw_label)
            else:
                label = derive_label(content)

            rows.append(
                {
                    "Content": content,
                    "label": label,
                    "service": row.get("service") or "synthetic-service",
                    "level": row.get("level") or "INFO",
                }
            )

    return rows


def deduplicate_rows(rows):
    seen = set()
    deduped = []
    for row in rows:
        key = (row["Content"].lower(), row["label"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)
    return deduped


def write_csv(rows, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["Content", "label", "service", "level"])
        writer.writeheader()
        writer.writerows(rows)


def summarize(rows):
    total = len(rows)
    anomalies = sum(1 for r in rows if int(r["label"]) == 1)
    normals = total - anomalies
    ratio = anomalies / total if total else 0.0
    return {"rows": total, "normal": normals, "anomaly": anomalies, "anomaly_ratio": round(ratio, 4)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build final training dataset from runtime + synthetic logs")
    parser.add_argument(
        "--runtime-jsonl",
        default="../backend/data/logs.jsonl",
        help="Path to runtime logs jsonl",
    )
    parser.add_argument(
        "--synthetic-csv",
        default="project_logs_dataset.csv",
        help="Path to synthetic CSV",
    )
    parser.add_argument(
        "--output",
        default="final_training_dataset.csv",
        help="Output CSV path",
    )
    args = parser.parse_args()

    base = Path(__file__).resolve().parent
    runtime_path = (base / args.runtime_jsonl).resolve()
    synthetic_path = (base / args.synthetic_csv).resolve()
    output_path = (base / args.output).resolve()

    runtime_rows = load_runtime_logs(runtime_path)
    synthetic_rows = load_synthetic_dataset(synthetic_path)

    merged = deduplicate_rows(runtime_rows + synthetic_rows)
    write_csv(merged, output_path)

    print("Runtime rows:", len(runtime_rows))
    print("Synthetic rows:", len(synthetic_rows))
    print("Final rows:", len(merged))
    print("Summary:", summarize(merged))
    print("Output:", output_path)
