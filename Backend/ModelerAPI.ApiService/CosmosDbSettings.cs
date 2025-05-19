// Backend/ModelerAPI.ApiService/Configuration/CosmosDbSettings.cs
namespace ModelerAPI.ApiService.Configuration
{
    public class CosmosDbSettings
    {
        public const string SectionName = "CosmosDb";

        // Cosmos DB connection settings
        public string EndpointUrl { get; set; } = string.Empty;
        public string PrimaryKey { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = string.Empty;
        public string ContainerName { get; set; } = string.Empty;
        
        // Gremlin API settings
        public string GremlinHostname { get; set; } = string.Empty;
        public int GremlinPort { get; set; }
        public string GremlinUsername { get; set; } = string.Empty;
        public string GremlinPassword { get; set; } = string.Empty;
    }
}
