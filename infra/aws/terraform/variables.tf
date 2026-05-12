variable "aws_region" {
  description = "AWS region for regional resources. CloudFront is global."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name prefix for resources."
  type        = string
  default     = "clanworld-ika-demo"
}

variable "enable_relayer" {
  description = "Create App Runner service for the relayer. Keep false to minimize cost."
  type        = bool
  default     = false
}

variable "relayer_image" {
  description = "ECR image URL for the relayer container. Required when enable_relayer is true."
  type        = string
  default     = ""
}

variable "relayer_env" {
  description = "Environment variables for relayer App Runner. Do not put production secrets in tfvars committed to git."
  type        = map(string)
  default     = {}
  sensitive   = true
}
