provider "azurerm" {
  features {}
  subscription_id = var.sub_id
  resource_provider_registrations = "none"
  tenant_id = var.tenant_id
}
