resource "aws_s3_bucket" "releases" {
  bucket = "${var.project_name}-releases-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-releases"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "releases" {
  bucket = aws_s3_bucket.releases.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "releases" {
  bucket = aws_s3_bucket.releases.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "releases" {
  bucket = aws_s3_bucket.releases.id

  rule {
    id     = "expire-old-releases"
    status = "Enabled"

    filter {}

    expiration {
      days = var.release_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = var.release_retention_days
    }
  }
}

data "aws_caller_identity" "current" {}
