# Architecture Overview

## Components

- Frontend Dashboard (Next.js)
  - Visualizes system health, logs, alerts, and ML insights.
- Backend API (Express)
  - Accepts logs, executes anomaly analysis, coordinates alerting and healing.
- ML Runtime (Python)
  - Trains and predicts anomalies using Isolation Forest.
- AWS Services
  - S3 for raw log object storage.
  - SNS for anomaly alert notifications.

## Data Flow

1. Client submits log to backend.
2. Backend appends local JSONL log store and uploads object to S3.
3. Backend triggers asynchronous local retraining.
4. Client/automation requests analysis for a log.
5. Python predictor returns anomaly score and status.
6. If anomaly detected, backend publishes SNS alert and records auto-healing event.
7. Frontend polls status and logs endpoints for visualization.

## Scalability Notes

- Training separated from API request latency by asynchronous retraining.
- Simple event-like workflow can be evolved into queue-based architecture (SQS/Kafka).
- AWS integrations are modular and can move behind Lambda/API Gateway.
