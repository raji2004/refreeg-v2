# ACM certificate — DNS validated. This does NOT assume Route53 manages the
# zone (nothing in this repo indicates it does); the CNAME validation records
# are surfaced as a Terraform output for you to add manually wherever
# www.refreeg.com / apps.refreeg.com DNS actually lives, then `terraform apply`
# again once ACM shows the cert as ISSUED.
resource "aws_acm_certificate" "app" {
  domain_name               = var.domain_name_www
  subject_alternative_names = [var.domain_name_apps]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.project_name}-cert"
    Environment = var.environment
  }
}

resource "aws_lb" "app" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.default.ids

  tags = {
    Name        = "${var.project_name}-alb"
    Environment = var.environment
  }
}

# NOTE: the app's /api/health route (lib/health/checks.ts) returns 401 if
# HEALTH_CHECK_TOKEN is set, and ALB target group health checks cannot send
# custom headers — leave HEALTH_CHECK_TOKEN unset in SSM Parameter Store (the
# route fails open with no token configured) so ALB health checks keep working.

resource "aws_lb_target_group" "frontend" {
  name        = "${var.project_name}-frontend"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "instance"

  health_check {
    path                = "/api/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name        = "${var.project_name}-frontend"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "api" {
  name        = "${var.project_name}-api"
  port        = 4000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "instance"

  health_check {
    path                = "/api/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name        = "${var.project_name}-api"
    Environment = var.environment
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.app.arn

  # Default action; the host-based rules below take precedence for the two
  # real domains. Anything else hits the frontend as a safe fallback.
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

resource "aws_lb_listener_rule" "www_to_frontend" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }

  condition {
    host_header {
      values = [var.domain_name_www]
    }
  }
}

resource "aws_lb_listener_rule" "apps_to_api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    host_header {
      values = [var.domain_name_apps]
    }
  }
}
