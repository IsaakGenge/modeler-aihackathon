using Gremlin.Net.Driver;
using Gremlin.Net.Structure.IO.GraphSON;
using Microsoft.Azure.Cosmos;
using ModelerAPI.ApiService.Models;
namespace ModelerAPI.ApiService.Services
{
    public class CosmosService : ICosmosService
    {
        private readonly CosmosClient _cosmosClient;
        private readonly Microsoft.Azure.Cosmos.Container _container;
        private readonly GremlinClient _gremlinClient;

        public CosmosService()
        {
            // Cosmos DB Emulator connection
            _cosmosClient = new CosmosClient("https://localhost:8081", "<your-emulator-key>");
            _container = _cosmosClient.GetContainer("YourDatabase", "YourContainer");

            // Gremlin API connection (Cosmos DB Gremlin endpoint)
            var gremlinServer = new GremlinServer("localhost", 8901, enableSsl: false);
            var messageSerializer = new GraphSON2MessageSerializer();
            _gremlinClient = new GremlinClient(gremlinServer, messageSerializer);
        }

        public async Task<Node> CreateNodeAsync(Node node)
        {
            // Store in Cosmos DB
            await _container.CreateItemAsync(node, new PartitionKey(node.Id));
            var gremlinQuery = $"g.addV('node').property('id', '{node.Id}').property('name', '{node.Name}')";
            await _gremlinClient.SubmitAsync<dynamic>(gremlinQuery);
            return node;
        }
    }
}


