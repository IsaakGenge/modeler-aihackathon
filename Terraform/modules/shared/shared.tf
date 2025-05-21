
# Check if the resource group already exists
data "azurerm_resource_group" "existing_rg" {
  count = var.use_existing_resource_group ? 1 : 0
  name  = var.resource_group_name
}

# Create the resource group only if it doesn't exist
resource "azurerm_resource_group" "rg" {
  count    = var.use_existing_resource_group ? 0 : 1
  name     = var.resource_group_name
  location = var.resource_group_location
}

# Use the resource group name dynamically based on whether it exists or is created
locals {
  resource_group_name = var.use_existing_resource_group ? data.azurerm_resource_group.existing_rg[0].name : azurerm_resource_group.rg[0].name
}

# App Service Plan
resource "azurerm_service_plan" "app_service_plan" {
  name                = var.app_service_plan_name
  location            = var.resource_group_location
  resource_group_name = var.resource_group_name
  os_type			  = "Linux"
  sku_name			  = "S1"
  tags				  = var.tags

  lifecycle {
    ignore_changes = [name,tags]
  }
}

# Add the missing data source for client configuration
data "azurerm_client_config" "current" {}

# Key Vault
resource "azurerm_key_vault" "key_vault" {
  name                        = var.key_vault_name
  location                    = var.resource_group_location
  resource_group_name         = var.resource_group_name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  purge_protection_enabled    = true
  soft_delete_retention_days  = 90
  tags                        = var.tags

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = ["Get", "List", "Set", "Delete"]
    key_permissions    = ["Get", "List", "Create", "Delete"]
    certificate_permissions = ["Get", "List", "Create", "Delete"]
  }

  lifecycle {
    ignore_changes = [name,tags]
  }
}


# Azure Application
resource "azuread_application" "app_registration" { 
  display_name     = var.app_registration_name 
  sign_in_audience = "AzureADMultipleOrgs"
  owners           = [data.azurerm_client_config.current.object_id]  

  # Redirect URIs for SPA
  single_page_application  {
    redirect_uris = [ "http://localhost:60006/close", "https://${var.frontend_app_name}.azurewebsites.net/close" ]
  }  
        

  lifecycle {
    ignore_changes = [display_name]
  }
}  

resource "azuread_application_password" "client_secret" {
  application_id = azuread_application.app_registration.id  
}

# Service Principal
resource "azuread_service_principal" "app_service_principal" {
  client_id       = azuread_application.app_registration.client_id
  owners          = [data.azurerm_client_config.current.object_id]
}

# Service Principal Password
resource "azuread_service_principal_password" "app_service_principal_password" {
  service_principal_id  = azuread_service_principal.app_service_principal.id 
  #end_date             = "2099-12-31T23:59:59Z"
}

resource "azurerm_key_vault_secret" "client_id" {
  name         = "ClientId"
  value        = azuread_application.app_registration.client_id
  key_vault_id = azurerm_key_vault.key_vault.id
}

resource "azurerm_key_vault_secret" "client_secret" {
  name         = "ClientSecret"
  value        = azuread_application_password.client_secret.value
  key_vault_id = azurerm_key_vault.key_vault.id
}
