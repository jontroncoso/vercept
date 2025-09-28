provider "aws" {
  region = "us-east-1" # Change to your region
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
variable "aws_region" { default = "us-east-1" }
variable "domain_name" { default = "tronco.so" }
variable "subdomain" { default = "chatbot.tronco.so" }
variable "folder" { default = "chatbot" }
variable "hosted_zone_id" {}
variable "bucket_name" {}
variable "cloudfront_acm_certificate_arn" {}


resource "aws_s3_object" "provision_source_files" {
  bucket   = var.bucket_name
  for_each = fileset("../dist/", "**")

  key          = "${var.folder}/${each.value}"
  source       = "../dist/${each.value}"
  etag         = filemd5("../dist/${each.value}") # Ensures updates on file content changes
  content_type = lookup(local.mime_types, regex("\\.[^.]+$", each.value), null)
}


# CloudFront Origin Access Control (recommended for new distributions)
resource "aws_cloudfront_origin_access_control" "chatbot_oac" {
  name                              = "chatbot-oac"
  description                       = "OAC for /chatbot CloudFront"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ACM Certificate for the subdomain (chatbot.tronco.so)
resource "aws_acm_certificate" "chatbot" {
  domain_name               = var.subdomain
  validation_method         = "DNS"
  subject_alternative_names = [var.subdomain]

  lifecycle {
    create_before_destroy = true
  }
}

# DNS Validation Records
resource "aws_route53_record" "chatbot_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.chatbot.domain_validation_options : dvo.domain_name => {
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

# ACM Certificate Validation
resource "aws_acm_certificate_validation" "chatbot" {
  certificate_arn         = aws_acm_certificate.chatbot.arn
  validation_record_fqdns = [for record in aws_route53_record.chatbot_cert_validation : record.fqdn]
}

# CloudFront Distribution for /chatbot
resource "aws_cloudfront_distribution" "chatbot" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront distribution for /chatbot"
  default_root_object = "index.html"

  aliases = [var.subdomain]

  origin {
    domain_name              = "${var.bucket_name}.s3.amazonaws.com"
    origin_id                = "s3-chatbot-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.chatbot_oac.id
    origin_path              = "/chatbot"
  }

  custom_error_response {
    error_code            = 403
    response_page_path    = "/index.html"
    response_code         = 200
    error_caching_min_ttl = 300
  }


  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-chatbot-origin"

    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  price_class = "PriceClass_100"

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.chatbot.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  depends_on = [aws_acm_certificate_validation.chatbot]

}

# S3 Bucket Policy to allow CloudFront OAC access to /chatbot/*
data "aws_iam_policy_document" "chatbot_policy" {
  statement {
    actions = ["s3:GetObject"]
    resources = [
      "arn:aws:s3:::${var.bucket_name}/${var.folder}/*"
    ]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.chatbot.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "chatbot_policy" {
  bucket = var.bucket_name
  policy = data.aws_iam_policy_document.chatbot_policy.json
}


data "aws_route53_zone" "main" {
  name = var.domain_name
}

resource "aws_route53_record" "www_alias" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.subdomain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.chatbot.domain_name    # Get the CloudFront domain name
    zone_id                = aws_cloudfront_distribution.chatbot.hosted_zone_id # Get the CloudFront hosted zone ID
    evaluate_target_health = true
  }
}
