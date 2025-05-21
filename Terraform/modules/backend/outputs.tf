output "backend_app_name" {
  value = azurerm_linux_web_app.backend_app.name
}

output "function_app_default_hostname" {
  value = "https://${azurerm_linux_web_app.backend_app.default_hostname}"
}

output "function_app_identity" {
  value = azurerm_linux_web_app.backend_app.identity
}

