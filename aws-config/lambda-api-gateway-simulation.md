# Lambda + API Gateway Simulation Notes

This project runs backend APIs locally with Express to reduce cost and speed up development.

## Why Simulation

- API Gateway and Lambda can be added later for production deployment.
- Local simulation keeps testing loops fast and avoids extra cloud charges.

## Upgrade Path

1. Move Express handlers into Lambda-compatible functions.
2. Front API with API Gateway routes.
3. Keep S3 + SNS logic unchanged (already modularized in backend services).
