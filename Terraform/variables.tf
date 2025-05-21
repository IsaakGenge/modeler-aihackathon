variable "env" {
  description = "The environment type (dev, test, prod)"
  type        = string
  default     = "dev"
  validation {
    condition     = contains(["dev", "test", "prod"], var.env)
    error_message = "The env must be one of: dev, test, prod."
  }
}

variable "sub_id" {
  description = "A subscription id override"
  type        = string
  default     = ""  
}

variable "tenant_id" {
  description = "A tenant id override"
  type        = string
  default     = ""  
}

variable "frontend_source_location" {
  description = "The location of the frontend source code"
  type        = string
  default     = "../Frontend/tools/dist.zip"
}

variable "backend_source_location" {
  description = "The location of the backend source code"
  type        = string
  default     = "../Backend/src/bin/Release/net8.0/publish.zip"
}

variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
  default     = "" # Change this to your existing resource group name
}

variable "resource_group_location" {
  description = "The location of the resource group"
  type        = string
  default     = "" # Change this to your existing resource group name
}
