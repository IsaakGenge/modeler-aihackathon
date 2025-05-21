output "resource_group_name" {
  value = var.resource_group_name
}

output "resource_group_location" {
  value = var.resource_group_location
}


output "app_service_plan_id" {
  value = azurerm_service_plan.app_service_plan.id
}

output "key_vault_id" {
  value = azurerm_key_vault.key_vault.id
}

output "client_id" {
  value = azuread_application.app_registration.client_id
}

output "client_id_keyvault_id" {
 value = azurerm_key_vault_secret.client_id.id
}

output "client_secret_keyvault_id" {
 value = azurerm_key_vault_secret.client_secret.id
}
