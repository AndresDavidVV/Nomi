output "alb_dns_name" {
  value = aws_lb.ccc_alb.dns_name
  description = "DNS name of the Application Load Balancer"
}

output "database_endpoint" {
  value = aws_db_instance.ccc_db.endpoint
  description = "Endpoint of the RDS database"
}

output "ecr_repository_url" {
  value = aws_ecr_repository.ccc_app.repository_url
  description = "URL of the ECR repository"
}
