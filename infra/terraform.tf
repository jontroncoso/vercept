########################################
# Variables
########################################
variable "aws_region" { default = "us-east-1" }
variable "domain_name" { default = "example.com" }       # Root domain (in the same Route 53 hosted zone)
variable "subdomain" { default = "chatbot.example.com" } # Full subdomain you want to use for CloudFront
variable "bucket_name" {}                                # S3 bucket to hold your site content
variable "folder" { default = "chatbot" }                # Folder prefix for site assets (serves index.html from here)
variable "hosted_zone_id" {}                             # Route 53 hosted zone ID for domain_name
variable "openai_api_key" {}                             # Your OpenAI API key
########################################
# Providers
########################################
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region # Must be us-east-1 for CloudFront ACM, and default is set accordingly
}

########################################
# Locals
########################################
locals {
  # CloudFront hosted zone ID for A/AAAA alias targets (global constant)
  cloudfront_zone_id = "Z2FDTNDATAQYW2"
}
locals {
  mime_types = {
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".ico"  = "image/vnd.microsoft.icon"
    ".jpeg" = "image/jpeg"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
  }
}

########################################
# Lambda: aws_lambda_function.chat (function_name = "chat")
########################################
resource "aws_iam_role" "lambda_exec" {
  name = "chat-lambda-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logging" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "lambda_s3_put" {
  name        = "chat-lambda-s3-put-policy"
  description = "Allow Lambda to put objects in the site bucket"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:PutObject"
        ],
        Resource = "${data.aws_s3_bucket.site.arn}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_s3_put" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_s3_put.arn
}

# Lambda Function for /infra/openai.ts
data "archive_file" "vercept_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/"
  output_path = "${path.module}/lambda/function.zip"
  excludes    = ["src/**"]
}

resource "aws_lambda_function" "vercept_chat" {
  filename         = data.archive_file.vercept_lambda.output_path
  function_name    = "vercept_chat"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "dist/chat.chat"
  source_code_hash = data.archive_file.vercept_lambda.output_base64sha256

  runtime = "nodejs20.x"
  timeout = 120

  environment {
    variables = {
      VITE_OPENAI_API_KEY = var.openai_api_key
      NODE_ENV            = "production"
      LOG_LEVEL           = "info"
    }
  }


  tags = {
    Environment = "production"
    Application = "Vercept"
  }
}

resource "aws_lambda_function" "vercept_upload" {
  filename         = data.archive_file.vercept_lambda.output_path
  function_name    = "vercept_upload"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "dist/upload.upload"
  source_code_hash = data.archive_file.vercept_lambda.output_base64sha256

  runtime = "nodejs20.x"
  timeout = 120

  environment {
    variables = {
      VITE_BUCKET_NAME = var.bucket_name
      NODE_ENV         = "production"
      LOG_LEVEL        = "info"
    }
  }


  tags = {
    Environment = "production"
    Application = "Vercept"
  }
}

########################################
# API Gateway v2 (HTTP API) → Lambda
# Exact path: /api/chat
########################################
resource "aws_apigatewayv2_api" "http_api" {
  name          = "chat-http-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "chat" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.vercept_chat.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "api_chat" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /api/chat"
  target    = "integrations/${aws_apigatewayv2_integration.chat.id}"
}

resource "aws_apigatewayv2_integration" "upload" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.vercept_upload.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "api_upload" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /api/upload"
  target    = "integrations/${aws_apigatewayv2_integration.upload.id}"
}

resource "aws_cloudwatch_log_group" "apigw_logs" {
  name              = "/aws/apigateway/chat-http-api"
  retention_in_days = 14
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/apigateway/chat-http-api"
    format = jsonencode({
      requestId      = "$context.requestId",
      ip             = "$context.identity.sourceIp",
      caller         = "$context.identity.caller",
      user           = "$context.identity.user",
      requestTime    = "$context.requestTime",
      httpMethod     = "$context.httpMethod",
      resourcePath   = "$context.resourcePath",
      status         = "$context.status",
      protocol       = "$context.protocol",
      responseLength = "$context.responseLength"
    })
  }
}

resource "aws_lambda_permission" "apigw_to_chat" {
  statement_id  = "AllowAPIGatewayInvokeChat"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.vercept_chat.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_to_upload" {
  statement_id  = "AllowAPIGatewayInvokeUpload"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.vercept_upload.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

########################################
# S3: Private site bucket + index.html at prefix var.folder
########################################
data "aws_s3_bucket" "site" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_cors_configuration" "site" {
  bucket = data.aws_s3_bucket.site.id

  cors_rule {
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = data.aws_s3_bucket.site.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = data.aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Minimal index.html (served at https://<subdomain>/ thanks to origin_path below)
resource "aws_s3_object" "provision_source_files" {
  bucket   = var.bucket_name
  for_each = fileset("../dist/", "**")

  key          = "${var.folder}/${each.value}"
  source       = "../dist/${each.value}"
  etag         = filemd5("../dist/${each.value}") # Ensures updates on file content changes
  content_type = lookup(local.mime_types, regex("\\.[^.]+$", each.value), null)
}

########################################
# ACM Certificate for CloudFront (must be in us-east-1)
########################################
data "aws_route53_zone" "main" {
  name = var.domain_name
}

resource "aws_acm_certificate" "cf_cert" {
  domain_name       = var.subdomain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation record in your hosted zone
resource "aws_route53_record" "cf_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cf_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}


resource "aws_acm_certificate_validation" "cf_cert_validation" {
  certificate_arn         = aws_acm_certificate.cf_cert.arn
  validation_record_fqdns = [for r in aws_route53_record.cf_cert_validation : r.fqdn]
}

########################################
# CloudFront: OAC + Distribution w/ custom domain
########################################

# Managed policies
data "aws_cloudfront_cache_policy" "caching_optimized" { name = "Managed-CachingOptimized" }
data "aws_cloudfront_cache_policy" "caching_disabled" { name = "Managed-CachingDisabled" }
data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" { name = "Managed-AllViewerExceptHostHeader" }

# Origin Access Control for S3
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "oac-${var.bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront needs a host-only domain for API GW
locals {
  apigw_host = replace(aws_apigatewayv2_api.http_api.api_endpoint, "https://", "")
}

resource "aws_cloudfront_distribution" "dist" {
  enabled             = true
  comment             = "Vercept Chatbot Distribution"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  aliases             = [var.subdomain]

  # --- Origins ---

  # S3 origin (private) with origin_path to your folder
  origin {
    origin_id                = "s3-origin"
    domain_name              = data.aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
    origin_path              = "/${var.folder}"

    s3_origin_config {
      origin_access_identity = "" # empty when using OAC
    }
  }

  # API Gateway origin
  origin {
    origin_id   = "apigw-origin"
    domain_name = local.apigw_host

    custom_origin_config {
      origin_protocol_policy = "https-only"
      https_port             = 443
      http_port              = 80
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  # --- Behaviors ---

  # Default -> S3 (index.html in var.folder)
  default_cache_behavior {
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
    compress               = true
  }

  # /api/* -> API Gateway (your exact route /api/chat is here)
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "apigw-origin"
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    compress                 = true
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  # Use validated ACM cert (must be in us-east-1)
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cf_cert_validation.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  logging_config {
    include_cookies = false
    bucket          = "troncoso-logs.s3.amazonaws.com" # Change to your logging bucket
    prefix          = "cloudfront/"
  }

  depends_on = [
    aws_s3_bucket_ownership_controls.site,
    aws_s3_bucket_public_access_block.site,
    aws_s3_object.provision_source_files,
    aws_acm_certificate_validation.cf_cert_validation
  ]
}

########################################
# S3 Bucket Policy (allow this CF dist via OAC)
########################################
data "aws_caller_identity" "current" {}

resource "aws_s3_bucket_policy" "allow_cf" {
  bucket = data.aws_s3_bucket.site.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Sid       = "AllowCloudFrontRead",
      Effect    = "Allow",
      Principal = { Service = "cloudfront.amazonaws.com" },
      Action    = "s3:GetObject",
      Resource  = "${data.aws_s3_bucket.site.arn}/*",
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${aws_cloudfront_distribution.dist.id}"
        }
      }
    }]
  })
}

########################################
# Route 53: Alias subdomain → CloudFront
########################################
resource "aws_route53_record" "subdomain_a" {
  zone_id = var.hosted_zone_id
  name    = var.subdomain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.dist.domain_name
    zone_id                = local.cloudfront_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "subdomain_aaaa" {
  zone_id = var.hosted_zone_id
  name    = var.subdomain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.dist.domain_name
    zone_id                = local.cloudfront_zone_id
    evaluate_target_health = false
  }
}

########################################
# Outputs
########################################
output "cloudfront_domain" {
  value = aws_cloudfront_distribution.dist.domain_name
}

output "site_https_url" {
  value = "https://${var.subdomain}/"
}

# Your exact Lambda path via CloudFront:
output "chat_via_cloudfront" {
  value = "https://${var.subdomain}/api/chat"
}

# (Direct) API Gateway base URL for debugging
output "apigw_api_endpoint" {
  value = aws_apigatewayv2_api.http_api.api_endpoint
}
