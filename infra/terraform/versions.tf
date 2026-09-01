terraform {
  required_version = ">= 1.12"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket                      = "tfstate"
    key                         = "portal/terraform.tfstate"
    region                      = "us-east-1"
    endpoints                   = { s3 = "http://localhost:9000" }
    access_key                  = "admin"
    secret_key                  = "change-me-please"
    use_path_style              = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
  }
}

provider "aws" {
  region = var.aws_region
}
