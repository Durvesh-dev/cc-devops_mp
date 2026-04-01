# Project Context - Autonomous AI DevOps Engineer

## Snapshot

- Date: 2026-03-26
- Goal: Build a real-world style cloud DevOps + MLOps system with self-healing simulation.
- Stack:
  - Frontend: Next.js + Tailwind CSS + Recharts
  - Backend: Node.js + Express + AWS SDK v3
  - ML: Python + Scikit-learn Isolation Forest
  - AWS: S3 + SNS (cost-optimized local-first model training)

## What Was Implemented In This Iteration

1. Backend rewrite
- Added robust log payload support (`log` or `message` input).
- Implemented API orchestration for:
  - `POST /api/logs`
  - `POST /api/analyze`
  - `GET /api/status`
  - `GET /api/logs` (dashboard convenience)
- Added state metrics tracking:
  - totalLogs, totalAnalyses, anomalyCount, alertCount, autoHealingCount.
- Added optional AWS simulation mode when credentials/region/topic/bucket are missing.

2. ML upgrade
- Enhanced feature extraction with additional anomaly signals.
- Added synthetic dataset seeding when dataset is missing.
- Improved JSON outputs in training script for backend parsing.
- Preserved local retraining strategy to replace `model.pkl` after new logs.

3. Integration behavior
- Backend calls Python scripts via child process.
- On anomaly:
  - SNS publish attempt
  - auto-healing event recorded (`Simulated ECS task restart`)
- On new logs:
  - async local retraining triggered.

4. Frontend rebuild (production-style)
- Replaced old static frontend with Next.js app router.
- Added professional dark dashboard with:
  - Sidebar navigation (Dashboard, Logs, Alerts, ML Insights)
  - Metric cards
  - Recharts area and pie charts
  - Logs table with severity/status badges
  - Alerts panel with severity labels
  - ML insight JSON panels

5. Documentation and config
- Added top-level README with setup + architecture + cost strategy.
- Added AWS setup/config docs in `aws-config/`.

## Known Decisions

- Keep local model training for cost efficiency and simplicity.
- Keep AWS integration optional to allow local demo without cloud spend.
- Use polling from frontend for near-real-time updates.

## Suggested Next Iteration Backlog

1. Add persistence DB (DynamoDB/PostgreSQL) for logs and incidents.
2. Add auth (JWT/Cognito) and role-based access for dashboard.
3. Add OpenTelemetry traces and service-level drill-down.
4. Add model evaluation metrics and drift report endpoint.
5. Containerize backend/frontend and add CI/CD pipeline.
