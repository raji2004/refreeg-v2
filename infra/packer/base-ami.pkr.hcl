# Base AMI for the refreeg app tier — rebuilt only when the runtime stack
# changes (Node version bump, etc.), NOT on every app deploy. App code itself
# is pulled from S3 at boot/deploy time (see scripts/bootstrap-instance.sh),
# so this image only needs the runtime, not the app.
#
# Build:
#   packer init infra/packer/base-ami.pkr.hcl
#   packer build infra/packer/base-ami.pkr.hcl
#
# Then update `base_ami_id` in your terraform.tfvars to the new AMI ID and
# `terraform apply` to roll it out via an ASG instance refresh.

packer {
  required_plugins {
    amazon = {
      source  = "github.com/hashicorp/amazon"
      version = "~> 1.3"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "node_version" {
  type    = string
  default = "22"
}

source "amazon-ebs" "base" {
  region        = var.aws_region
  instance_type = "t4g.medium" # build on the same arch we deploy to (ARM64/Graviton)
  ssh_username  = "ec2-user"

  ami_name        = "refreeg-app-base-{{timestamp}}"
  ami_description = "Amazon Linux 2023 ARM64 with Node.js ${var.node_version}, pnpm, and PM2 preinstalled for the refreeg app tier"

  source_ami_filter {
    filters = {
      name                = "al2023-ami-*-arm64"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    owners      = ["amazon"]
    most_recent = true
  }

  tags = {
    Name    = "refreeg-app-base"
    Project = "refreeg"
  }
}

build {
  name    = "refreeg-app-base"
  sources = ["source.amazon-ebs.base"]

  # Amazon Linux 2023 ships the SSM Agent preinstalled and enabled already —
  # nothing to do there. Just the app runtime:
  provisioner "shell" {
    inline = [
      "sudo dnf install -y nodejs${var.node_version} git",
      "sudo npm install -g pnpm pm2",
      "sudo mkdir -p /opt/refreeg-bootstrap /opt/refreeg",
    ]
  }

  provisioner "file" {
    source      = "../../scripts/bootstrap-instance.sh"
    destination = "/tmp/bootstrap-instance.sh"
  }

  provisioner "shell" {
    inline = [
      "sudo mv /tmp/bootstrap-instance.sh /opt/refreeg-bootstrap/bootstrap-instance.sh",
      "sudo chmod +x /opt/refreeg-bootstrap/bootstrap-instance.sh",
    ]
  }
}
