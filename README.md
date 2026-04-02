# Autonomous AI DevOps Engineer - Self-Healing Cloud System

A full-stack cloud DevOps project that **autonomously** monitors log files, detects anomalies with an Isolation Forest model, triggers alerts via AWS SNS, and simulates auto-healing actions — all without manual intervention.

## 1) Project Structure

- `frontend/` - Next.js + Tailwind real-time monitoring dashboard
- `backend/` - Express APIs + Autonomous log watcher + AWS SDK integration
- `ml-model/` - Python training and prediction scripts (IsolationForest)
- `aws-config/` - AWS setup templates and cost-optimized guidance
- `docs/` - architecture notes and rolling context log

## 2) Architecture — Autonomous Pipeline

```
logs/app.log → File Watcher → Decision Engine → ML Predict → SNS Alert → Dashboard (SSE)
```

1. **Log Watcher** (`utils/logWatcher.js`) monitors `logs/app.log` using `fs.watch` with byte-offset tracking.
2. New log lines are detected in real-time and fed into the autonomous pipeline.
3. **Decision Engine** (`services/decisionEngine.js`) auto-classifies service, severity, and issue type.
4. **ML Service** (`services/mlService.js`) runs `predict.py` (IsolationForest) via `child_process`.
5. If anomaly detected → **SNS Alert** (`services/snsService.js`) publishes formatted alert.
6. All events stream to the **Frontend Dashboard** via Server-Sent Events (SSE).

**No manual API calls or user input required** — the system operates fully autonomously.

## 3) Backend Setup (Node.js)

```bash
cd backend
npm install
copy .env.example .env
npm run start
```

The log watcher starts automatically when the server boots. To trigger the pipeline, simply append lines to `backend/logs/app.log`:

```bash
echo "ERROR database connection refused after 5 retries" >> backend/logs/app.log
```

### APIs (still available for compatibility):
- `GET /api/events` — SSE real-time event stream
- `GET /api/status` — system status + metrics
- `GET /api/logs` — recent logs
- `POST /api/logs` — manual log ingestion
- `POST /api/analyze` — manual analysis

## 4) ML Setup (Python)

```bash
cd ml-model
python -m pip install -r requirements.txt
python train.py
python predict.py "ERROR checkout service timeout 5400ms"
```

- Model: `IsolationForest` + rule-based hybrid
- Artifact: `ml-model/model/model.pkl`
- Inference: backend calls `predict.py` via `child_process.spawn`

## 5) Frontend Setup (Next.js + Tailwind)

```bash
cd frontend
npm install
set NEXT_PUBLIC_API_BASE=http://localhost:5000/api
npm run dev
```

Open `http://localhost:3000`. The dashboard automatically connects via SSE and displays:
- **Dashboard** — metric cards, charts, live pipeline activity feed
- **Logs** — real-time log stream (read-only, no input forms)
- **Alerts** — active and recent anomaly alerts
- **ML Insights** — pipeline status, last prediction, auto-healing events

## 9) Docker (Run UI + API)

This repo includes Dockerfiles for both services and a `docker-compose.yml` at the project root.

### Run

```bash
docker compose up --build
```

- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`

By default the containerized backend runs with an in-memory store (no DynamoDB/AWS required) so you can demo locally.

## 10) Jenkins (CI)

A basic pipeline is provided in `Jenkinsfile`:
- Installs backend deps
- Installs frontend deps + runs `npm run lint`
- Builds Docker images for backend + frontend

Requirement: Jenkins agent must have Docker available.

## 11) Terraform (AWS Infra)

Terraform scaffolding lives in `infra/terraform/` and can provision:
- DynamoDB tables
- SNS topic
- S3 bucket

```bash
cd infra/terraform
terraform init
terraform apply
```


## 6) Cloud + DevOps + MLOps Mapping

- Cloud Computing: S3 object storage, SNS alerting, optional Lambda/API Gateway simulation.
- DevOps: autonomous log monitoring, live metrics, alerting, and auto-healing workflow simulation.
- MLOps: anomaly model training, inference integration in backend, local retraining, and model replacement.

## 7) Cost Optimization Strategy

- Train model locally in `ml-model/`.
- Use minimal AWS services: S3 + SNS.
- Keep payloads lightweight JSON.

## 8) Environment Files

- Backend: `backend/.env` (copy from `backend/.env.example`)
- Frontend: `frontend/.env.local` (copy from `frontend/.env.local.example`)
- AWS: `aws-config/aws.env.example`

### Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_FILE_PATH` | `backend/logs/app.log` | Log file to monitor |
| `PYTHON_CMD` | `python` | Python executable |
| `MODEL_PATH` | `ml-model/model/model.pkl` | Model artifact path |
| `SNS_TOPIC_ARN` | — | AWS SNS topic for alerts |
