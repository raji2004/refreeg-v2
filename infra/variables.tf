variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short name used as a prefix for all resource names/tags."
  type        = string
  default     = "refreeg"
}

variable "environment" {
  description = "Environment name (e.g. production, staging)."
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 instance type for the app tier (matches the current single-box setup)."
  type        = string
  default     = "t4g.medium"
}

variable "asg_min_size" {
  description = "Minimum number of app instances."
  type        = number
  default     = 1
}

variable "asg_max_size" {
  description = "Maximum number of app instances the ASG can scale out to."
  type        = number
  default     = 4
}

variable "asg_on_demand_base_capacity" {
  description = "Number of on-demand instances to always keep as a guaranteed floor; the rest of desired capacity is filled with Spot."
  type        = number
  default     = 1
}

variable "base_ami_id" {
  description = "AMI ID built by infra/packer/base-ami.pkr.hcl (Node.js/pnpm/PM2 preinstalled on Amazon Linux 2023 ARM64). Update after each Packer build."
  type        = string
}

variable "domain_name_www" {
  description = "Landing page domain (routed to the frontend target group, port 3000)."
  type        = string
  default     = "www.refreeg.com"
}

variable "domain_name_apps" {
  description = "App/API domain (routed to the api target group, port 4000)."
  type        = string
  default     = "apps.refreeg.com"
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage_gb" {
  description = "RDS allocated storage in GB."
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Initial database name created on the RDS instance."
  type        = string
  default     = "refreeg"
}

variable "db_username" {
  description = "Master username for the RDS instance."
  type        = string
  default     = "refreeg_admin"
}

variable "db_password" {
  description = "Master password for the RDS instance. Pass via TF_VAR_db_password or a tfvars file that is never committed."
  type        = string
  sensitive   = true
}

variable "release_retention_days" {
  description = "Days to retain old release tarballs in S3 before they expire."
  type        = number
  default     = 30
}
