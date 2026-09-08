locals {
  ssm_param_path = "/${var.project_name}/${var.environment}"

  # Runs on every boot via cloud-init user-data. The actual deploy logic lives
  # in /opt/refreeg-bootstrap/bootstrap-instance.sh, baked into the AMI by
  # infra/packer/base-ami.pkr.hcl — this just supplies the two env vars it
  # needs and invokes it.
  user_data = <<-EOF
    #!/bin/bash
    export RELEASES_BUCKET="${aws_s3_bucket.releases.bucket}"
    export SSM_PARAM_PATH="${local.ssm_param_path}"
    /opt/refreeg-bootstrap/bootstrap-instance.sh >> /var/log/refreeg-bootstrap.log 2>&1
  EOF
}

resource "aws_launch_template" "app" {
  name_prefix   = "${var.project_name}-app-"
  image_id      = var.base_ami_id
  instance_type = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.app_instance.name
  }

  vpc_security_group_ids = [aws_security_group.app.id]

  # Public IP so instances can reach S3/SSM without a NAT Gateway — locked
  # down by aws_security_group.app (no inbound except from the ALB, no SSH).
  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.app.id]
  }

  user_data = base64encode(local.user_data)

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.project_name}-app"
      Environment = var.environment
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "${var.project_name}-app"
  vpc_zone_identifier = data.aws_subnets.default.ids
  min_size            = var.asg_min_size
  max_size            = var.asg_max_size
  desired_capacity    = var.asg_min_size

  target_group_arns = [
    aws_lb_target_group.frontend.arn,
    aws_lb_target_group.api.arn,
  ]

  health_check_type         = "ELB"
  health_check_grace_period = 90

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = var.asg_on_demand_base_capacity
      on_demand_percentage_above_base_capacity = 0 # everything above the base is Spot
      spot_allocation_strategy                 = "price-capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version             = "$Latest"
      }
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-app"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  # Existing instances get new code via SSM Run Command from CI (see
  # .github/workflows/deploy.yml), not by replacing the whole ASG — an
  # instance refresh here is only for base-AMI rollouts (Packer rebuilds),
  # not routine app deploys.
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }
}
