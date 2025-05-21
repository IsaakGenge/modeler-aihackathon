variable "backend_app_name" {
  description = "Name of the Azure Function App"
  type        = string
}

variable "location" {
  description = "Azure region for the Function App"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "app_service_plan_id" {
  description = "ID of the App Service Plan"
  type        = string
}

variable "zip_deploy_file" {
  description = "Path to code zip file"
  type        = string
}

variable "tags" {
  description = "Tags to apply to the Function App"
  type        = map(string)
  default     = {}
}

variable "key_vault_id" {
  description = "ID of the Key Vault"
  type        = string
}

variable "prod" {
  description = "Is this a production deployment?"
  type        = bool
}

variable "gremlin_database_name" {
  description = "The name of the Gremlin database"
  type        = string
  default     = "db1"
}

variable "gremlin_graph_name" {
  description = "The name of the Gremlin graph"
  type        = string
  default     = "coll1"
}

variable "cosmos_db_name" {
  description = "The name of the Cosmos DB account"
  type        = string
}
