import argparse
import csv
import random
from datetime import datetime, timedelta

SERVICES = [
    "auth-service",
    "payment-service",
    "database-service",
    "api-gateway",
    "notification-service",
    "inventory-service",
    "order-service",
    "cache-service",
]

HOSTS = ["ip-10-0-1-21", "ip-10-0-1-44", "ip-10-0-2-11", "ip-10-0-2-70", "ip-10-0-3-15"]

NORMAL_TEMPLATES = [
    "{service} request completed successfully status=200 latency={latency}ms",
    "{service} health check passed in {latency}ms",
    "{service} cache hit ratio stable at {metric}%",
    "{service} token issued for session refresh latency={latency}ms",
    "{service} database query completed in {latency}ms",
    "{service} worker processed batch={batch} records={records}",
    "{service} circuit breaker state=CLOSED throughput={metric}rps",
    "{service} queue consumer acked message id={reqid}",
    "{service} autoscale check complete cpu={metric}% memory={metric2}%",
    "{service} webhook delivered status=202 retry=0",
]

ANOMALY_TEMPLATES = [
    "{service} ERROR database connection refused after {retries} retries timeout={latency}ms",
    "{service} CRITICAL identity provider unreachable failed login burst detected",
    "{service} WARN payment timeout occurred while processing request latency={latency}ms",
    "{service} ERROR disk failure predicted on volume /dev/xvda utilization={metric}%",
    "{service} ERROR memory pressure detected heap usage {metric}% and growing",
    "{service} CRITICAL network disconnect between app and db packet loss={metric}%",
    "{service} ERROR transaction failed due to invalid signature code=AUTH_DENIED",
    "{service} WARN api rate limit exceeded denied requests={records}",
    "{service} ERROR upstream gateway timeout status=504 latency={latency}ms",
    "{service} CRITICAL service unreachable after deploy rollback required",
]

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
}


def label_from_text(text: str) -> int:
    lower = text.lower()
    return 1 if any(keyword in lower for keyword in KEYWORDS) else 0


def build_log_line(base_time: datetime, idx: int, anomaly: bool) -> tuple[str, int, str, str]:
    ts = base_time + timedelta(seconds=idx * random.randint(1, 3))
    service = random.choice(SERVICES)
    host = random.choice(HOSTS)
    level = random.choice(["INFO", "DEBUG"]) if not anomaly else random.choice(["WARN", "ERROR", "CRITICAL"])

    template = random.choice(ANOMALY_TEMPLATES if anomaly else NORMAL_TEMPLATES)
    message = template.format(
        service=service,
        latency=random.randint(20, 4500),
        metric=random.randint(30, 99),
        metric2=random.randint(20, 95),
        batch=random.randint(1, 25),
        records=random.randint(5, 1200),
        reqid=f"req-{random.randint(10000, 99999)}",
        retries=random.randint(2, 9),
    )

    content = f"{ts.isoformat()} {level} [{service}] host={host} {message}"
    label = label_from_text(content)
    return content, label, service, level


def generate_dataset(total_rows: int, anomaly_ratio: float, output_path: str) -> None:
    anomaly_count = int(total_rows * anomaly_ratio)
    normal_count = total_rows - anomaly_count

    rows = [False] * normal_count + [True] * anomaly_count
    random.shuffle(rows)

    start_time = datetime(2026, 4, 1, 8, 0, 0)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["Content", "label", "service", "level"],
        )
        writer.writeheader()

        for idx, anomaly in enumerate(rows):
            content, label, service, level = build_log_line(start_time, idx, anomaly)
            writer.writerow(
                {
                    "Content": content,
                    "label": label,
                    "service": service,
                    "level": level,
                }
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic project-like log dataset")
    parser.add_argument("--rows", type=int, default=12000, help="Total number of rows")
    parser.add_argument("--anomaly-ratio", type=float, default=0.35, help="Fraction of anomaly logs")
    parser.add_argument(
        "--output",
        type=str,
        default="project_logs_dataset.csv",
        help="Output CSV path",
    )
    args = parser.parse_args()

    if args.rows < 100:
        raise ValueError("rows must be at least 100")
    if not (0.05 <= args.anomaly_ratio <= 0.8):
        raise ValueError("anomaly-ratio must be between 0.05 and 0.8")

    generate_dataset(args.rows, args.anomaly_ratio, args.output)
    print(f"Generated {args.rows} rows at {args.output}")
