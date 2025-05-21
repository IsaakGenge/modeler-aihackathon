variable "use_existing_resource_group" {
  description = "Set to true to use an existing resource group, false to create a new one"
  type        = bool
  default     = false
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "resource_group_location" {
  description = "Azure region for resources"
  type        = string
}

variable "app_service_plan_name" {
  description = "Name of the app service plan"
  type        = string
}

variable "tags" {
  description = "Tags to apply to the Web App"
  type        = map(string)
  default     = {}
}

variable "key_vault_name" {
	description = "Name of the keyvault"
	type        = string
	default     = ""
}

variable "app_registration_name" {
	description = "Name of the app registration"
	type        = string
	default     = ""
}

variable "tenant_id" {
	description = "Tenant ID for Azure AD"
	type        = string
	default     = ""
}

variable "prod" {
	description = "Production or development"
	type        = bool
	default     = false
}

variable "frontend_app_name" {
	description = "Name of the front end app"
	type        = string
	default     = ""
}