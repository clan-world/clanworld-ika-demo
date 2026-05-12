output "ui_bucket" {
  value = aws_s3_bucket.ui.bucket
}

output "ui_cloudfront_domain" {
  value = aws_cloudfront_distribution.ui.domain_name
}

output "relayer_url" {
  value       = var.enable_relayer ? aws_apprunner_service.relayer[0].service_url : null
  description = "App Runner relayer URL when enabled."
}
