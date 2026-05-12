locals {
  bucket_name = "${var.project_name}-${substr(md5(var.project_name), 0, 8)}"
}

resource "aws_s3_bucket" "ui" {
  bucket = local.bucket_name
}

resource "aws_s3_bucket_public_access_block" "ui" {
  bucket                  = aws_s3_bucket.ui.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "ui" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC for Clan World demo UI"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "ui" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.ui.bucket_regional_domain_name
    origin_id                = "ui-s3-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.ui.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ui-s3-origin"

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_s3_bucket_policy" "ui" {
  bucket = aws_s3_bucket.ui.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid = "AllowCloudFrontServicePrincipalReadOnly"
      Effect = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action = "s3:GetObject"
      Resource = "${aws_s3_bucket.ui.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.ui.arn
        }
      }
    }]
  })
}

resource "aws_iam_role" "apprunner_ecr_access" {
  count = var.enable_relayer ? 1 : 0
  name  = "${var.project_name}-apprunner-ecr-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  count      = var.enable_relayer ? 1 : 0
  role       = aws_iam_role.apprunner_ecr_access[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

resource "aws_apprunner_service" "relayer" {
  count        = var.enable_relayer ? 1 : 0
  service_name = "${var.project_name}-relayer"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access[0].arn
    }

    image_repository {
      image_identifier      = var.relayer_image
      image_repository_type = "ECR"

      image_configuration {
        port = "8787"
        runtime_environment_variables = var.relayer_env
      }
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu    = "0.25 vCPU"
    memory = "0.5 GB"
  }
}
