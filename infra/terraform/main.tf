# Network shape: one public subnet (has a route to the internet gateway, so
# the operator can reach the instance) and two private subnets for RDS
# (no route out at all — RDS requires 2+ AZs for its subnet group even with
# a single instance). The portal instance's security group then locks
# EGRESS to VPC-only traffic, so even though its subnet technically has an
# IGW route available, the instance itself can never actually use it to
# reach the public internet. That's what makes "no live package installs"
# a network-enforced fact here, not just a convention.

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "lab" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "portal-lab-vpc" }
}

resource "aws_internet_gateway" "lab" {
  vpc_id = aws_vpc.lab.id
  tags   = { Name = "portal-lab-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.lab.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  tags                    = { Name = "portal-lab-public" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.lab.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.lab.id
  }
  tags = { Name = "portal-lab-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.lab.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "portal-lab-private-${count.index}" }
  # deliberately no route table association to the IGW — no path out at all
}

resource "aws_db_subnet_group" "lab" {
  name       = "portal-lab-db-subnets"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "portal-lab-db-subnets" }
}

# --- Security groups ---

resource "aws_security_group" "portal" {
  name_prefix = "portal-lab-ec2-"
  vpc_id      = aws_vpc.lab.id

  ingress {
    description = "SSH from the operators own IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  ingress {
    description = "The portal app itself, same restriction"
    from_port   = 8443
    to_port     = 8443
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  egress {
    description = "VPC-only - this instance has no route to the public internet at all"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = { Name = "portal-lab-ec2-sg" }
}

resource "aws_security_group" "rds" {
  name_prefix = "portal-lab-rds-"
  vpc_id      = aws_vpc.lab.id

  ingress {
    description     = "Postgres, from the portal instances security group only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.portal.id]
  }

  tags = { Name = "portal-lab-rds-sg" }
}

# --- Compute + database ---

resource "aws_key_pair" "portal" {
  key_name   = "portal-lab-key"
  public_key = var.portal_public_key
}

resource "aws_instance" "portal" {
  ami                         = var.instance_ami
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.portal.id]
  associate_public_ip_address = true
  key_name                    = aws_key_pair.portal.key_name

  tags = { Name = "portal-lab" }

  lifecycle {
    precondition {
      condition     = var.instance_type == "t2.micro" || var.instance_type == "t3.micro"
      error_message = "Stick to a free-tier eligible instance type for this lab."
    }
  }
}

resource "aws_db_instance" "portal" {
  identifier             = "portal-lab-db"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t3.micro" # free-tier eligible, 750 hrs/month for 12 months
  allocated_storage      = 20            # free-tier ceiling
  db_name                = "portal"
  username               = "postgres"
  password               = var.db_master_password
  db_subnet_group_name   = aws_db_subnet_group.lab.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  skip_final_snapshot    = true

  tags = { Name = "portal-lab-db" }
}
