# Terraform (AWS)

This folder provisions the AWS resources the project expects:
- DynamoDB tables (logs, anomalies, alerts, auto-healing)
- SNS topic for alerts
- S3 bucket (optional) for logs/model storage

## Prereqs
- Terraform installed
- AWS credentials configured in your environment (recommended: AWS CLI profile)

## Usage

```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

Outputs include table names, SNS topic ARN, and bucket name.

## Notes
- This module **does not** create IAM users/access keys.
- DynamoDB tables use `PAY_PER_REQUEST` billing mode.
