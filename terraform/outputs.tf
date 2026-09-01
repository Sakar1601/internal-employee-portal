output "portal_public_ip" {
  value       = aws_instance.portal.public_ip
  description = "Reach the portal at https://<this>:8443/ and SSH at this IP — both locked to your IP by the security group."
}

output "portal_instance_id" {
  value = aws_instance.portal.id
}

output "rds_endpoint" {
  value       = aws_db_instance.portal.address
  description = "Feeds into both Vault's database secrets engine config and the Ansible extra-var db_host."
}
