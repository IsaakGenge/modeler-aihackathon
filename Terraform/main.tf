locals {
	resource_group_name				= var.resource_group_name
	resource_group_location			= var.resource_group_location
	use_existing_resource_group		= true		
	seed							= substr(random_id.value.hex, 1, 5) # Random ID for unique resource names
	prod							= var.env == "prod" ? true : false
	cosmos_db_name			        = "modeler-cosmos-db"   
	app_service_plan_name			= "modeler-asp-${local.seed}"     
	key_vault_name					= "modeler-kv-${local.seed}"      
	app_registration_name			= "modeler-app-${local.seed}"     
	frontend_app_name				= "modeler-frontend-${local.seed}"
	backend_app_name				= "modeler-backend-${local.seed}" 
	tags = {
		environment = var.env
		project     = "fusion-in-fabric"
	}
}

module "shared" {
  source                      = "./modules/shared"
  use_existing_resource_group = local.use_existing_resource_group
  resource_group_name         = local.resource_group_name
  resource_group_location     = local.resource_group_location  
  app_service_plan_name       = local.app_service_plan_name 
  key_vault_name              = local.key_vault_name
  app_registration_name       = local.app_registration_name
  tenant_id                   = var.tenant_id
  frontend_app_name           = local.frontend_app_name
  prod                        = local.prod
  tags                        = local.tags
}

module "frontend" {
  source					 = "./modules/frontend"
  web_app_name				 = local.frontend_app_name
  location					 = module.shared.resource_group_location
  resource_group_name		 = module.shared.resource_group_name
  app_service_plan_id		 = module.shared.app_service_plan_id
  key_vault_id				 = module.shared.key_vault_id  
  client_id					 = module.shared.client_id
  client_id_keyvault_id      = module.shared.client_id_keyvault_id
  client_secret_keyvault_id  = module.shared.client_secret_keyvault_id
  tenant_id					 = var.tenant_id
  backend_url				 = module.backend.function_app_default_hostname
  zip_deploy_file 			 = var.frontend_source_location
  tags						 = local.tags
  prod					     = local.prod
  depends_on				 = [module.shared, module.backend]
}

module "backend" {
  source									   = "./modules/backend"
  backend_app_name							   = local.backend_app_name
  location									   = module.shared.resource_group_location
  resource_group_name						   = module.shared.resource_group_name
  app_service_plan_id						   = module.shared.app_service_plan_id
  key_vault_id								   = module.shared.key_vault_id
  cosmos_db_name						       = local.cosmos_db_name
  zip_deploy_file						       = var.backend_source_location  
  tags							               = local.tags
  prod									       = local.prod
  depends_on					               = [module.shared]
}

# Create a random ID to use as a suffix for resource names
resource "random_id" "value" {
  keepers = {
    #first = "${timestamp()}"
  }     
  byte_length = 8 
}
