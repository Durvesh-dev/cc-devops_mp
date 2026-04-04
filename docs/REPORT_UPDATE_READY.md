# DevOps / Cloud Computing Mini Project Report

## Title
Autonomous AI DevOps Engineer: Self-Healing Cloud Monitoring and Incident Response Platform

## Abstract
This project implements an autonomous cloud-native DevOps system that continuously ingests logs, detects anomalies using machine learning and rule-based intelligence, triggers AWS notifications, executes automated healing workflows, and visualizes the complete incident lifecycle in real time. The platform integrates AWS DynamoDB, SNS, S3, and CloudWatch for persistence, alerting, model management, and observability. The solution demonstrates a practical closed-loop reliability workflow: Observe, Detect, Alert, Heal, and Verify.

## 1. Introduction
Modern distributed applications generate high-volume logs. Manual monitoring often causes delayed incident detection and slow response. This project addresses that challenge by automating log monitoring, anomaly detection, alerting, and healing visibility in a single integrated system.

## 2. Problem Statement
Traditional operations pipelines are reactive and fragmented:
- Logs are monitored manually.
- Incidents are detected late.
- Alerting and remediation are disconnected.
- Operators lack clear issue-to-healing traceability.

The objective is to build an autonomous AIOps workflow that reduces detection and response time while improving operational clarity.

## 3. Objectives
- Continuously ingest and monitor logs without manual triggers.
- Detect anomalies using ML + rule fallback.
- Trigger cloud alerts based on severity policy.
- Execute service-specific healing workflows.
- Persist events for analytics and dashboard use.
- Show real-time issue lifecycle with clear healing correlation.

## 4. Scope
- Real-time log pipeline.
- ML-based anomaly detection.
- Cloud alerting and persistence.
- Live operational dashboard.
- Simulated healing actions with incident correlation.

## 5. System Architecture
The platform has four layers:

### 5.1 Ingestion Layer
- Log generator writes synthetic operational logs.
- File watcher reads only newly appended lines.

### 5.2 Intelligence Layer
- Python inference predicts anomaly signal.
- Decision engine combines ML and rule signals.
- Severity, issue type, and confidence are derived.

### 5.3 Action Layer
- Alert workflow publishes SNS notifications (for ERROR/CRITICAL).
- Healing workflow generates recovery actions.
- Records are persisted in DynamoDB.

### 5.4 Presentation Layer
- Frontend receives SSE events.
- Dashboard shows metrics, timeline, and ML insights in real time.

## 6. Technology Stack and Justification

### Frontend
- Next.js + React + Tailwind CSS
- Reason: fast component-based UI and real-time visualization.

### Backend
- Node.js + Express
- Reason: lightweight API orchestration and easy AWS + Python integration.

### ML Runtime
- Python + scikit-learn
- Reason: practical text anomaly classification workflow.

### Real-Time Transport
- Server-Sent Events (SSE)
- Reason: efficient server-to-client event streaming.

### AWS Services
- DynamoDB: structured event store for dashboard and analytics.
- SNS: alert notifications to users.
- S3: model artifact source (model_updated.pkl) with startup sync.
- CloudWatch: log stream monitoring sink.

## 7. Detailed Workflow
1. New log line is generated or appended.
2. File watcher detects new content.
3. Backend stores log and calls ML predictor.
4. Decision engine finalizes anomaly and severity.
5. If anomaly true:
   - Issue found event emitted.
   - Alert created and SNS publish attempted.
   - Healing action generated.
   - Issue healed event emitted after action creation.
6. Health status is recomputed.
7. Frontend updates timeline and metrics via SSE.

## 8. Machine Learning Pipeline
- Training dataset: merged real runtime logs + synthetic project-style logs.
- Text preprocessing: lowercase, digit and symbol normalization.
- Vectorization: TF-IDF.
- Model: RandomForestClassifier.
- Save artifact: model_updated.pkl.
- Deployment path: uploaded to S3 and synced to backend local runtime path at startup.

## 9. AWS Integration Details
- MODEL_S3_KEY is configured to model/model_updated.pkl.
- REQUIRE_S3_MODEL=true enforces startup failure if S3 model sync fails.
- This ensures backend uses S3-synced model for detection.
- DynamoDB tables store logs, anomalies, alerts, and healing actions.
- SNS policy sends notifications for ERROR and CRITICAL severities.

## 10. Dashboard and User Experience
- Dashboard cards: Total Logs, Anomalies, Alerts, Auto-Healing.
- Latency Trend: recent response time pattern.
- Operational Quality Mix: anomaly rate, healed coverage, open incident rate.
- Live Pipeline Activity: Issue found -> Healing initiated -> Issue healed.
- Incident correlation: common incident identifier is shown to map healed action to original issue.

## 11. Key Improvements Implemented
- Fixed timeline filter behavior.
- Fixed duplicate children key issue in React timeline.
- Normalized healed event styling as resolved (not critical).
- Added incident correlation metadata across alert and healing.
- Added S3-enforced model sync path.
- Added robust prediction output normalization in predict.py.
- Created large realistic dataset and final merged training dataset.

## 12. Testing and Validation
- API validation for normal and anomaly logs.
- Metrics verification before and after analyze calls.
- S3 model sync validation through status endpoint.
- DynamoDB and CloudWatch activity validated in runtime logs.

## 13. Results
- Continuous autonomous log processing achieved.
- Accurate anomaly signaling on project-style logs improved.
- SNS alert flow operational for configured severities.
- Healing lifecycle clearly visible and traceable in UI.
- Cloud-integrated model usage enforced successfully.

## 14. Limitations
- Healing actions are simulation-level orchestration, not direct infrastructure restart commands.
- Rule-based labels can still bias model behavior.
- Production hardening (security roles, scale queueing) can be extended.

## 15. Future Enhancements
- Integrate controlled EC2/SSM remediation for real infrastructure actions.
- Add model drift monitoring and retraining governance.
- Introduce queue/event bus for very high throughput.
- Add role-based access and stronger audit trails.

## 16. Conclusion
The project successfully demonstrates a practical AIOps implementation combining cloud services, automated detection, alerting, healing, and real-time visibility. It meets DevOps and Cloud Computing learning objectives with an end-to-end autonomous reliability workflow.

## 17. References
- AWS Documentation: S3, DynamoDB, SNS, CloudWatch
- Node.js and Express documentation
- scikit-learn documentation
- Next.js documentation
