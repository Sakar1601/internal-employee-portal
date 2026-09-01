variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region for the lab VPC and instances."
}

variable "allowed_ssh_cidr" {
  type        = string
  description = "Your IP in CIDR form (e.g. 203.0.113.4/32) — SSH and app-port ingress are locked to this and nothing else."
}

variable "instance_ami" {
  type        = string
  description = "AMI ID for the portal instance. Verify the current Amazon Linux 2023 AMI for your region before applying — this value goes stale."
}

variable "instance_type" {
  type        = string
  default     = "t2.micro"
  description = "Free-tier eligible instance type. Do not change without checking free-tier eligibility first."
}

variable "vpc_cidr" {
  type    = string
  default = "10.42.0.0/16"
}

variable "public_subnet_cidr" {
  type    = string
  default = "10.42.1.0/24"
}

variable "private_subnet_cidrs" {
  type        = list(string)
  default     = ["10.42.2.0/24", "10.42.3.0/24"]
  description = "RDS requires a subnet group spanning at least two AZs, even for a single instance."
}

variable "db_master_password" {
  type        = string
  sensitive   = true
  description = "Initial RDS master password. Vault's database secrets engine uses this ONE TIME to connect and generate dynamic per-session credentials — nothing in the app itself ever uses this password directly."
}
