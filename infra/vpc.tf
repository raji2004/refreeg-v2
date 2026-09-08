# Reuse the account's default VPC/subnets rather than provisioning a new VPC.
# Keeps this cheap (no NAT Gateway ~$32/mo) — app instances get public IPs but
# are locked down by security groups, and RDS is not publicly accessible even
# though it sits in the same subnets.
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}
