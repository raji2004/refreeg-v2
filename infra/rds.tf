# Single-AZ Postgres — no Multi-AZ per cost decision (accepted trade-off: a
# hardware failure or maintenance event means a restore-from-backup instead
# of an automatic ~60-120s failover). Sits in the same default-VPC subnets as
# everything else, but is not publicly reachable: publicly_accessible = false
# and its security group only allows traffic from the app instances.

resource "aws_db_subnet_group" "app" {
  name       = "${var.project_name}-db"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name        = "${var.project_name}-db"
    Environment = var.environment
  }
}

resource "aws_db_instance" "app" {
  identifier     = "${var.project_name}-${var.environment}"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage_gb
  max_allocated_storage = var.db_allocated_storage_gb * 3 # storage autoscaling ceiling
  storage_type          = "gp3"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.app.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  multi_az = false # explicit per cost decision — see comment above

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:30-mon:05:30"

  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final"
  deletion_protection       = true

  tags = {
    Name        = "${var.project_name}-${var.environment}"
    Environment = var.environment
  }
}
