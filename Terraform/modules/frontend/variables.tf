variable "web_app_name" {
  description = "Name of the web application"
  type        = string
}

variable "location" {
  description = "Azure region for the web application"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "app_service_plan_id" {
  description = "ID of the app service plan"
  type        = string
}

variable "zip_deploy_file" {
  description = "Path to code deploy zip file"
  type        = string
}

variable "tags" {
  description = "Tags to apply to the Web App"
  type        = map(string)
  default     = {}
}


variable "key_vault_id" {
  description = "ID of the Key Vault"
  type        = string
}

variable "client_id" {
  description = "Client ID for the Azure AD application"
  type        = string
}
variable "tenant_id" {
  description = "Tenant ID for the Azure AD application"
  type        = string
}

variable "client_secret_keyvault_id" {
  description = "Keyvault ID for Client secret for the Azure AD application"
  type        = string
}

variable "client_id_keyvault_id" {
  description = "Keyvault Id for Client ID for the Azure AD application"
  type        = string
}

variable "backend_url" {
  description = "Backend URL for the web application"
  type        = string
}
variable "prod" {
  description = "Is this a production deployment?"
  type        = bool
}