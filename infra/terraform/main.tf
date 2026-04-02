locals {
  tags = {
    Project = var.project_name
    Managed = "terraform"
  }
}

resource "aws_dynamodb_table" "logs" {
  name         = var.dynamodb_table_names.logs
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "anomalies" {
  name         = var.dynamodb_table_names.anomalies
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "alerts" {
  name         = var.dynamodb_table_names.alerts
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = local.tags
}

resource "aws_dynamodb_table" "auto_healing" {
  name         = var.dynamodb_table_names.auto_healing
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = local.tags
}

resource "aws_sns_topic" "alerts" {
  name = var.sns_topic_name
  tags = local.tags
}

resource "aws_s3_bucket" "project" {
  count  = var.create_s3_bucket ? 1 : 0
  bucket = var.s3_bucket_name != "" ? var.s3_bucket_name : "${var.project_name}-${random_id.bucket_suffix.hex}"

  tags = local.tags
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket_public_access_block" "project" {
  count                   = var.create_s3_bucket ? 1 : 0
  bucket                  = aws_s3_bucket.project[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
