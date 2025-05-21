resource "azurerm_linux_web_app" "web_app" {
  name                = var.web_app_name
  location            = var.location
  resource_group_name = var.resource_group_name
  service_plan_id     = var.app_service_plan_id
  zip_deploy_file     = var.zip_deploy_file
  tags                = var.tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on = true
    application_stack {
      node_version   = "22-lts"
      
    }
  }

  app_settings = {
    "WEBSITE_RUN_FROM_PACKAGE" = "1"
    "ClientId"        = "KeyVault(SecretUri=${var.client_id_keyvault_id})"
    "ClientSecret"    = "KeyVault(SecretUri=${var.client_secret_keyvault_id})"    
    "WORKLOAD_BE_URL" = var.backend_url   
  }  
  
  auth_settings_v2 {
    auth_enabled                            = true
    runtime_version                         = "~1"
    require_authentication                  = true
    require_https                           = true
    unauthenticated_action                  = "RedirectToLoginPage"
    default_provider                        = "azureactivedirectory"
    
    
    active_directory_v2 {
      tenant_auth_endpoint                  = "https://login.microsoftonline.com/${var.tenant_id}/v2.0"
      client_id                             = var.client_id      
      client_secret_setting_name            = "ClientSecret"
      allowed_audiences                     = ["https://${var.web_app_name}.azurewebsites.net/.auth/login/aad/callback", "https://${var.web_app_name}.azurewebsites.net/.auth/login/aad/callback", "https://${var.web_app_name}.azurewebsites.net/auth.html","https://${var.web_app_name}.azurewebsites.net"]
      login_parameters                      = {}
    }

    login {
      token_store_enabled                   = false
      preserve_url_fragments_for_logins     = false
      cookie_expiration_convention          = "FixedTime"
      cookie_expiration_time                = "08:00:00"
      validate_nonce                        = true
      nonce_expiration_time                 = "00:05:00"
    }
  } 

  lifecycle {
    ignore_changes = [name,tags,auth_settings_v2[0].active_directory_v2[0].allowed_audiences]
  }
 
}

 resource "azurerm_role_assignment" "key_vault_reader" {
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.web_app.identity[0].principal_id
}


