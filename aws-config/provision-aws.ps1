param(
  [Parameter(Mandatory = $true)]
  [string]$Region,

  [Parameter(Mandatory = $true)]
  [string]$BucketName,

  [Parameter(Mandatory = $true)]
  [string]$TopicName,

  [Parameter(Mandatory = $true)]
  [string]$AlertEmail,

  [string]$Profile = "default"
)

$ErrorActionPreference = "Stop"

function Run-Aws {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  Write-Host "> aws $Command"
  $output = Invoke-Expression "aws $Command --profile $Profile"
  return $output
}

Write-Host "Provisioning AWS resources for CC_MP..."

if ($Region -eq "us-east-1") {
  Run-Aws "s3api create-bucket --bucket $BucketName --region $Region" | Out-Null
} else {
  Run-Aws "s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration LocationConstraint=$Region" | Out-Null
}

$topicArn = Run-Aws "sns create-topic --name $TopicName --region $Region --query TopicArn --output text"

$subscriptionArn = Run-Aws "sns subscribe --topic-arn $topicArn --protocol email --notification-endpoint $AlertEmail --region $Region --query SubscriptionArn --output text"

$callerIdentityJson = Run-Aws "sts get-caller-identity --region $Region --output json"
$callerIdentity = $callerIdentityJson | ConvertFrom-Json

Write-Host ""
Write-Host "AWS resource provisioning complete."
Write-Host "Confirm SNS email subscription in your inbox before testing alerts."
Write-Host ""
Write-Host "Created Resources"
Write-Host "- Region: $Region"
Write-Host "- Bucket: $BucketName"
Write-Host "- Topic ARN: $topicArn"
Write-Host "- Subscription ARN: $subscriptionArn"
Write-Host "- Account ID: $($callerIdentity.Account)"
Write-Host ""
Write-Host "Paste these into backend/.env"
Write-Host "AWS_REGION=$Region"
Write-Host "S3_BUCKET_NAME=$BucketName"
Write-Host "SNS_TOPIC_ARN=$topicArn"