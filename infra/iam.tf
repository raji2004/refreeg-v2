# ── App instance role ──────────────────────────────────────────────────────
# Attached to every ASG instance via the launch template's instance profile.
# Grants: SSM Agent registration (so Run Command can reach the instance),
# read-only access to the release tarballs in S3, and read access to this
# app's own secrets under its SSM Parameter Store path.

resource "aws_iam_role" "app_instance" {
  name = "${var.project_name}-app-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-app-instance"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "app_instance_ssm" {
  role       = aws_iam_role.app_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "app_instance_releases_read" {
  name = "${var.project_name}-releases-read"
  role = aws_iam_role.app_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.releases.arn,
          "${aws_s3_bucket.releases.arn}/*",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "arn:aws:kms:${var.aws_region}:${data.aws_caller_identity.current.account_id}:alias/aws/ssm"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "app_instance" {
  name = "${var.project_name}-app-instance"
  role = aws_iam_role.app_instance.name
}

# ── GitHub Actions deploy permissions ───────────────────────────────────────
# Attached to the existing IAM user whose static AWS_ACCESS_KEY_ID/
# AWS_SECRET_ACCESS_KEY are already stored as GitHub repo secrets (reused here
# rather than standing up OIDC federation as extra scope). Grants: write
# access to release tarballs, write access to this app's secrets path, and
# permission to trigger/poll SSM Run Command against the ASG instances.

variable "github_actions_iam_user_name" {
  description = "Name of the existing IAM user whose access key is stored in the EC2_* / AWS_* GitHub secrets."
  type        = string
}

resource "aws_iam_policy" "github_actions_deploy" {
  name        = "${var.project_name}-github-actions-deploy"
  description = "Permissions GitHub Actions needs to deploy via S3 + SSM Run Command"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.releases.arn,
          "${aws_s3_bucket.releases.arn}/*",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:PutParameter", "ssm:GetParameter", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Encrypt", "kms:Decrypt"]
        Resource = "arn:aws:kms:${var.aws_region}:${data.aws_caller_identity.current.account_id}:alias/aws/ssm"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:SendCommand",
          "ssm:GetCommandInvocation",
          "ssm:ListCommandInvocations",
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["autoscaling:DescribeAutoScalingGroups"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_user_policy_attachment" "github_actions_deploy" {
  user       = var.github_actions_iam_user_name
  policy_arn = aws_iam_policy.github_actions_deploy.arn
}
