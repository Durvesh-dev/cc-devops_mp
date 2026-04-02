output "aws_region" {
  value = var.aws_region
}

output "dynamodb_tables" {
  value = {
    logs         = aws_dynamodb_table.logs.name
    anomalies    = aws_dynamodb_table.anomalies.name
    alerts       = aws_dynamodb_table.alerts.name
    auto_healing = aws_dynamodb_table.auto_healing.name
  }
}

output "sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}

output "s3_bucket_name" {
  value       = var.create_s3_bucket ? aws_s3_bucket.project[0].bucket : null
  description = "S3 bucket name (if created)"
}
