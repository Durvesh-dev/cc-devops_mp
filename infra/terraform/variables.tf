variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Prefix used for naming/tagging"
  type        = string
  default     = "cc-devops-mp"
}

variable "create_s3_bucket" {
  description = "Whether to create an S3 bucket"
  type        = bool
  default     = true
}

variable "s3_bucket_name" {
  description = "S3 bucket name (must be globally unique). If empty, a generated name will be used."
  type        = string
  default     = ""
}

variable "dynamodb_table_names" {
  description = "DynamoDB table names used by the backend"
  type = object({
    logs        = string
    anomalies   = string
    alerts      = string
    auto_healing = string
  })
  default = {
    logs         = "LogsTable"
    anomalies    = "AnomaliesTable"
    alerts       = "AlertsTable"
    auto_healing = "AutoHealingTable"
  }
}

variable "sns_topic_name" {
  description = "SNS topic name for alerts"
  type        = string
  default     = "cc-mp-alerts"
}
