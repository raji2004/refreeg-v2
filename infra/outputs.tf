output "alb_dns_name" {
  description = "ALB DNS name — use this to smoke-test the deploy before cutting real DNS over (see plan's staged rollout)."
  value       = aws_lb.app.dns_name
}

output "rds_endpoint" {
  description = "RDS connection endpoint (host:port). Build DATABASE_URL from this after migrating data."
  value       = aws_db_instance.app.endpoint
  sensitive   = true
}

output "releases_bucket_name" {
  description = "S3 bucket GitHub Actions uploads release tarballs to — set as the RELEASES_BUCKET repo variable/secret."
  value       = aws_s3_bucket.releases.bucket
}

output "ssm_param_path" {
  description = "SSM Parameter Store path prefix GitHub Actions writes secrets under — set as the SSM_PARAM_PATH repo variable."
  value       = local.ssm_param_path
}

output "acm_certificate_domain_validation_options" {
  description = "CNAME records to add wherever www.refreeg.com / apps.refreeg.com DNS is hosted, to validate the ACM certificate. Required before the HTTPS listener can come up."
  value       = aws_acm_certificate.app.domain_validation_options
}

output "autoscaling_group_name" {
  description = "ASG name — used by the GitHub Actions workflow to look up current instance IDs for SSM Run Command targeting."
  value       = aws_autoscaling_group.app.name
}
