# Autonomous AI DevOps Engineer - Viva Preparation Notes

## 1) Project in One Line
This project is a self-healing AI-driven DevOps platform that monitors logs in real time, detects anomalies using ML + rules, triggers alerts, performs automated recovery actions, stores events persistently, and visualizes everything live on a dashboard.

## 2) Problem Statement
Traditional monitoring is reactive and manual. Teams often detect production issues late and fix them manually.

Our solution makes DevOps proactive by:
- Continuously ingesting logs
- Detecting anomalies automatically
- Triggering alerts automatically
- Executing auto-healing actions
- Streaming everything to a live command center UI

## 3) Tech Stack
- Frontend: Next.js + TailwindCSS
- Backend: Node.js + Express
- ML: Python predictor script
- AWS: DynamoDB, SNS, CloudWatch Logs, S3 (integration support)
- Real-time transport: SSE (Server-Sent Events)

## 4) High-Level Architecture
### Frontend Layer
- Dashboard, Logs, Alerts, Insights pages
- Live updates from backend events endpoint
- Premium activity timeline with filters and severity cues

### Backend Layer
- API routes for status, stats, logs, analyze, SSE events
- Log watcher + autonomous log generator
- Decision engine + ML service integration
- Healing/alert workflow service

### Data + Cloud Layer
- Persistent event storage in DynamoDB
- SNS alert publishing for ERROR/CRITICAL incidents
- CloudWatch stream push support for generated logs

## 5) End-to-End Flow (Most Important)
1. New log arrives (real or generated).
2. Log watcher reads only new lines safely (offset + partial buffer handling).
3. Backend predicts anomaly using Python ML model.
4. Decision engine fuses ML signal + rule logic to produce final incident decision.
5. Log and incident records are persisted.
6. If anomaly exists:
   - Alert is generated and optionally sent to SNS.
   - Service-specific auto-healing action is generated and stored.
7. Backend emits SSE events (log, prediction, alert, healing, status).
8. Frontend instantly updates cards, charts, and live pipeline timeline.

## 6) Why This is "Autonomous"
- No manual trigger required for monitoring.
- No manual classification required for anomaly detection.
- Automatic alerting and escalation rules.
- Automatic service-level remediation suggestions/actions.
- Automatic dynamic system health calculation.

## 7) Key Features Implemented
- Real-time log ingestion and pipeline processing
- ML + rule-fallback anomaly fusion
- DynamoDB persistence migration for logs/anomalies/alerts/healing events
- Persistent dashboard stats endpoint
- Dynamic health logic from recent real data
- Service-specific auto-healing mapping (database/auth/payment/app)
- SNS trigger policy refinement (ERROR/CRITICAL)
- Enhanced CloudWatch reliability logic
- Modern dashboard redesign with grouped, filterable activity timeline

## 8) Important Backend Components
- Log watcher: reads file updates and drives the full analysis pipeline
- Decision engine: turns ML + heuristics into explainable operational decisions
- Healing service: creates alert + recovery action workflows
- Dynamo store: persistent counts and recent history for UI and analysis
- Ops routes: exposes status/stats/logs and SSE stream

## 9) Important Frontend Components
- Central data hook to combine polling + SSE updates
- Metric cards for operational KPIs
- Mini trend bars for latency and analysis mix
- Live Pipeline Activity timeline with:
  - Filters (All / Alerts / Healing / Logs)
  - Grouped timeline buckets
  - Rich event chips (service, severity, source, time)
  - Severity-aware animations

## 10) AWS and Cost-Awareness Points
- App can run locally; stopping frontend/backend stops new API-driven AWS activity from this app.
- Persistent AWS resources can still cost (for example log retention, DynamoDB storage).
- Cost control strategy:
  - Use Budgets alerts
  - Keep retention short
  - Remove unused resources
  - Restrict high-cost services

## 11) Team Presentation Split (3 Members)
Member 1: Architecture + Backend pipeline
- End-to-end data flow
- SSE design and API responsibilities

Member 2: ML + Decision + AWS integration
- Predictor logic
- Alerting strategy
- Persistence and cloud reliability

Member 3: Frontend UX + Operations visibility
- Dashboard design and interaction
- Live timeline and incident readability
- Overall operator workflow

## 12) 60-Second Demo Script
"We start the backend watcher and autonomous log generator. New logs are ingested in real time and passed to the ML predictor. The decision engine combines ML and rule-based intelligence to classify anomalies. For incident logs, alerts are generated and recovery actions are created automatically. All records are persisted in DynamoDB. The frontend receives real-time SSE events and updates operational metrics and pipeline activity instantly. This demonstrates a closed-loop autonomous DevOps workflow: observe, decide, act, and visualize."

## 13) Common Viva Questions (With Strong Answers)
Q1. Why combine ML and rules?
A1. ML catches unseen patterns; rules provide deterministic safeguards and explainability.

Q2. Why SSE instead of WebSockets?
A2. Our dashboard mainly needs server-to-client event streaming; SSE is simpler and efficient for that one-way real-time flow.

Q3. Why DynamoDB?
A3. It provides low-latency, scalable, managed storage for event-style operational records.

Q4. How is reliability handled if AWS services fail?
A4. The system keeps local fallbacks and resilient flow logic so monitoring and decisioning continue even if specific cloud actions fail.

Q5. How is cloud cost controlled?
A5. By severity-gated alerts, local-first runtime, stopping dev services when idle, retention controls, and budget alarms.

## 14) Final Closing Line for Viva
This project demonstrates practical AIOps: real-time observability, intelligent incident detection, autonomous remediation workflows, and operator-friendly visibility in a single integrated platform.
