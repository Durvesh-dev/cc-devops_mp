# AWS Setup (Production-Ready + Local Integration)

## Services Used

- Amazon SNS (most important): anomaly alerts in real time.
- Amazon S3: stores ingested logs and model artifact (`model.pkl`).
- AWS Lambda (optional, high value): serverless backend deployment target.

## Prerequisites

1. AWS account access.
2. AWS CLI installed and configured (`aws configure`).
3. Backend running with your Python environment configured.

## Fast Provision (CLI Script)

Use the included PowerShell script to create S3 bucket + SNS topic + email subscription.

```powershell
cd aws-config
.\provision-aws.ps1 -Region us-east-1 -BucketName cc-mp-logs-<unique-suffix> -TopicName cc-mp-alerts -AlertEmail your_email@example.com
```

The script prints environment values to copy into backend `.env`.

## Manual Provision (AWS Console)

1. Create an S3 bucket:
   - Name example: `cc-mp-logs-<unique-suffix>`
   - Keep default settings unless your org requires encryption/tagging policies.
2. Create an SNS topic:
   - Type: Standard
   - Name example: `cc-mp-alerts`
3. Create SNS subscription:
   - Protocol: Email
   - Endpoint: your email
   - Confirm from your email inbox.
4. Upload model artifact to S3:
   - Object key example: `model/model.pkl`
   - Bucket can be the same log bucket or a dedicated model bucket.

## IAM (Least Privilege)

1. Create or use an IAM user for this app.
2. Attach the policy from `aws-config/iam-policy-example.json` after replacing placeholders.
3. Create access key for that IAM user.

Required permissions:
- `s3:PutObject` for `arn:aws:s3:::<bucket>/logs/*`
- `s3:GetObject` for your model artifact key (example `arn:aws:s3:::<bucket>/model/model.pkl`)
- `sns:Publish` for your SNS topic ARN

## Local Backend Wiring

1. Create backend env from template:

```powershell
cd backend
copy .env.example .env
```

2. Open backend `.env` and set values:

```env
PORT=5000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=cc-mp-logs-<unique-suffix>
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:<account-id>:cc-mp-alerts
PYTHON_CMD=python
MODEL_PATH=ml-model/model/model.pkl
ML_PREDICT_SCRIPT=ml-model/predict.py
MODEL_S3_BUCKET=cc-mp-logs-<unique-suffix>
MODEL_S3_KEY=model/model.pkl
```

3. Restart backend after changing `.env`.
4. Create frontend env from template and run frontend:

```powershell
cd frontend
copy .env.local.example .env.local
npm run dev
```

## Lambda Environment Variables

For Lambda function environment keys, use `aws-config/lambda.env.example`.

Important:
- Do not add `AWS_REGION` manually in Lambda env (reserved).
- Lambda runtime already sets region variables.

## Validation Checklist

1. `GET /api/status` shows `system.aws.enabled = true` and your region.
2. `GET /api/status` shows `system.modelSync.status = ready` after backend startup.
2. Submit log from frontend Logs page.
3. Confirm S3 object under `logs/` prefix.
4. Trigger anomaly and confirm SNS email received.
5. Insights page shows AWS integration details.

## Lambda Deployment Note (Optional, High Value)

Current app runs on Express locally. For serverless deployment you can package the same backend logic on AWS Lambda and expose through API Gateway:

1. API Gateway receives request.
2. Lambda executes API logic + ML inference trigger.
3. SNS and S3 integrations remain unchanged.

Project statement you can use:
"The backend can be deployed on AWS Lambda for serverless execution while retaining the same SNS alerting and S3 model/log storage flow."

## Optional Local-Only Mode

If AWS credentials or topic/bucket are not set, backend still runs and returns structured `skipped`/`error` status for AWS operations. This is useful for zero-cost local demos.
