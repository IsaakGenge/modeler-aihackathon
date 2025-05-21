resource "azurerm_linux_web_app" "backend_app" {
  name                       = var.backend_app_name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  service_plan_id            = var.app_service_plan_id 
  zip_deploy_file            = var.zip_deploy_file
  tags                       = var.tags
  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on = true
    ftps_state = "Disabled" # Optional: Disable FTP for security
    application_stack {
     dotnet_version = "8.0"
    }
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME = "dotnet"
    WEBSITE_RUN_FROM_PACKAGE = "1"
    #ConnectionString         = "KeyVault(SecretUri=${var.storage_account_connectionstring_keyvault_id})"
  }
 
  lifecycle {
    ignore_changes = [name,tags]
  }

}

resource "azurerm_role_assignment" "key_vault_reader" {
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.backend_app.identity[0].principal_id
}

resource "azurerm_cosmosdb_account" "cosmos_account" {
  name                = var.cosmos_db_name
  location            = var.location
  resource_group_name = var.resource_group_name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  capabilities {
    name = "EnableGremlin"
  }

  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }

  tags = var.tags
}

resource "azurerm_cosmosdb_gremlin_database" "gremlin_db" {
  name                = var.gremlin_database_name
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.cosmos_account.name
  throughput          = 400
}

resource "azurerm_cosmosdb_gremlin_graph" "gremlin_graph" {
  name                = var.gremlin_graph_name
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.cosmos_account.name
  database_name       = azurerm_cosmosdb_gremlin_database.gremlin_db.name
  partition_key_path  = "/pkey"
  throughput          = 400

  index_policy {
    automatic      = true
    indexing_mode  = "consistent"
    included_paths = ["/*"]
    excluded_paths = ["/\"_etag\"/?"]
  }
}

# Update the app settings to include the Gremlin connection information
locals {
  updated_app_settings = merge(
    azurerm_linux_web_app.backend_app.app_settings,
    {
      "GremlinEndpoint"     = azurerm_cosmosdb_account.cosmos_account.endpoint
      "GremlinPrimaryKey"   = azurerm_cosmosdb_account.cosmos_account.primary_key
      "GremlinDatabase"     = var.gremlin_database_name
      "GremlinGraph"        = var.gremlin_graph_name
    }
  )
}


resource "azurerm_key_vault_secret" "GremlinPrimaryKey" {
  name         = "GremlinPrimaryKey"
  value        = azurerm_cosmosdb_account.cosmos_account.primary_key
  key_vault_id = var.key_vault_id
}




