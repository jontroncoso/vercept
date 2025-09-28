# terraform.tfvars (example)
hosted_zone_id = "Z0253711396A5G9VVQ41W" # your Route53 public zone id
aws_region = "us-east-1"          # ACM for CloudFront must be in us-east-1
bucket_name = "troncoso-public" # S3 Bucket Name
domain_name = "tronco.so" # Your domain name
subdomain = "chatbot.tronco.so" # Your subdomain for the chatbot
folder = "chatbot" # The folder in the S3 bucket where the app is located
cloudfront_acm_certificate_arn = "arn:aws:acm:us-east-1:863518443980:certificate/c2705607-6974-420f-b000-b444e99117b8"
