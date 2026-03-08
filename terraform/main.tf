// terraform/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "ccc-terraform-state-767968023146"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

# Usar VPC existente (no crear nueva)
data "aws_vpc" "existing_vpc" {
  id = "vpc-01506c90b7cdc5c32"
}

# Subnets existentes
data "aws_subnet" "public_1" {
  id = "subnet-08a01f786e29d8c30"  # us-east-1a
}

data "aws_subnet" "public_2" {
  id = "subnet-0537814cbe55cd12e"  # us-east-1c
}

data "aws_subnet" "private_1" {
  id = "subnet-03bf18f41280a6527"  # us-east-1b
}

data "aws_subnet" "private_2" {
  id = "subnet-0a7abb96c9d6780e6"  # us-east-1f
}

# RDS Subnet Group
resource "aws_db_subnet_group" "ccc_db_subnet_group" {
  name       = "ccc-db-subnet-group"
  subnet_ids = [data.aws_subnet.private_1.id, data.aws_subnet.private_2.id]
}

# Security Group para RDS
resource "aws_security_group" "rds_sg" {
  name        = "ccc-rds-sg"
  vpc_id      = data.aws_vpc.existing_vpc.id
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECR Repository
resource "aws_ecr_repository" "ccc_app" {
  name                 = "ccc-app"
  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "ccc_cluster" {
  name = "ccc-cluster"
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Security Group para ECS
resource "aws_security_group" "ecs_sg" {
  name        = "ccc-ecs-sg"
  vpc_id      = data.aws_vpc.existing_vpc.id
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# S3 Bucket con nombre único
resource "random_id" "s3_suffix" {
  byte_length = 8
}

resource "aws_s3_bucket" "ccc_uploads" {
  bucket = "ccc-inteligencia-uploads-${random_id.s3_suffix.hex}"
}

resource "aws_s3_bucket_public_access_block" "ccc_uploads_public" {
  bucket = aws_s3_bucket.ccc_uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ccc_logs" {
  name              = "/ecs/ccc-app"
  retention_in_days = 30
}

# ALB Security Group
resource "aws_security_group" "alb_sg" {
  name        = "ccc-alb-sg"
  vpc_id      = data.aws_vpc.existing_vpc.id
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Application Load Balancer
resource "aws_lb" "ccc_alb" {
  name               = "ccc-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [data.aws_subnet.public_1.id, data.aws_subnet.public_2.id]
}

# ALB Target Group
resource "aws_lb_target_group" "ccc_tg" {
  name        = "ccc-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.existing_vpc.id
  target_type = "ip"
  health_check {
    path = "/api/health"
    matcher = "200-299"
  }
}

# ALB Listener
resource "aws_lb_listener" "ccc_listener" {
  load_balancer_arn = aws_lb.ccc_alb.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ccc_tg.arn
  }
}

# RDS Instance
resource "aws_db_instance" "ccc_db" {
  identifier              = "ccc-db"
  engine                 = "postgres"
  engine_version         = "16.12"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  db_name                = "ccc_inteligencia"
  username               = "postgres"
  password               = var.db_password
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.ccc_db_subnet_group.name
  skip_final_snapshot    = true
}

# ECS Task Definition (ANTES del Service)
resource "aws_ecs_task_definition" "ccc_task" {
  family                   = "ccc-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${aws_ecr_repository.ccc_app.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "DATABASE_URL", value = "postgresql://postgres:${var.db_password}@${aws_db_instance.ccc_db.endpoint}/ccc_inteligencia?schema=public" },
        { name = "NEXTAUTH_URL", value = "http://${aws_lb.ccc_alb.dns_name}" },
        { name = "AUTH_TRUST_HOST", value = "true" },
        { name = "NEXTAUTH_SECRET", value = var.nextauth_secret },
        { name = "GOOGLE_API_KEY", value = var.google_api_key },
        { name = "GOOGLE_GENERATIVE_AI_API_KEY", value = var.google_api_key },
        { name = "TWILIO_ACCOUNT_SID", value = var.twilio_account_sid },
        { name = "TWILIO_AUTH_TOKEN", value = var.twilio_auth_token },
        { name = "TWILIO_PHONE_NUMBER", value = var.twilio_phone_number }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/ccc-app"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

# ECS Service (DESPUÉS del Task Definition)
resource "aws_ecs_service" "ccc_service" {
  name            = "ccc-service"
  cluster         = aws_ecs_cluster.ccc_cluster.id
  task_definition = aws_ecs_task_definition.ccc_task.arn
  desired_count   = 2
  launch_type     = "FARGATE"
  network_configuration {
    subnets         = [data.aws_subnet.public_1.id, data.aws_subnet.public_2.id]
    security_groups = [aws_security_group.ecs_sg.id]
    assign_public_ip = true
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.ccc_tg.arn
    container_name   = "app"
    container_port   = 3000
  }
}
