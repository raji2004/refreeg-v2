terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state is required once more than one person/machine ever runs this.
  # Uncomment and point at a pre-created S3 bucket + DynamoDB lock table before
  # the first real `terraform apply` from a shared environment:
  #
  # backend "s3" {
  #   bucket         = "refreeg-terraform-state"
  #   key            = "production/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "refreeg-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}
