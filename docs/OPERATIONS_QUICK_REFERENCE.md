# Operations Quick Reference

## Purpose
This guide gives a quick operational checklist for running and validating the Autonomous AI DevOps project.

## Start Order
1. Start backend from `backend/`.
2. Start frontend from `frontend/`.
3. Open dashboard at `http://localhost:3000/dashboard`.

## Health Validation
1. Backend status endpoint: `GET /api/status`.
2. Stats endpoint: `GET /api/stats`.
3. Confirm metrics increment while logs are being generated.

## Incident Lifecycle (UI)
1. `Issue found`
2. `Healing initiated`
3. `Issue healed`

## AWS Validation Checklist
1. DynamoDB tables exist and item counts increase.
2. SNS topic ARN is configured for alert publishing.
3. S3 model key is configured when model sync is required.

## S3 Model Enforcement
Set `REQUIRE_S3_MODEL=true` in backend environment to force startup to fail if model sync from S3 does not succeed.

## Notes
- CloudWatch is used for monitoring stream support.
- DynamoDB is used as the structured query store for dashboard APIs.
- `.env` files should not be committed; use `.env.example` templates.
