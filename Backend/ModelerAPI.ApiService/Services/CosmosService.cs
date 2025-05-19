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
            _cosmosClient = new CosmosClient("https://localhost:8081", "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==");
            _container = _cosmosClient.GetContainer("model", "graph");

            // Gremlin API connection (Cosmos DB Gremlin endpoint)
            var server = new GremlinServer(hostname: "localhost", port: 65400, username: "/dbs/db1/colls/coll1", password: "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==");
            var messageSerializer = new GraphSON2MessageSerializer();
            _gremlinClient = new GremlinClient(server, messageSerializer);
        }

        public async Task<List<Node>> GetNodes()
        {
            // Query all nodes from Cosmos DB
            var gremlinQuery = "g.V().hasLabel('node')";
            var result = await _gremlinClient.SubmitAsync<dynamic>(gremlinQuery);
            var nodes = new List<Node>();

            foreach (var item in result)
            {
                try
                {
                    // Use indexer syntax for dynamic objects
                    string id = item["id"].ToString();
                    string name = "";
                    string nodeType = "default";
                    DateTime createdAt = DateTime.UtcNow;

                    // Extract properties safely
                    if (item["properties"] != null)
                    {
                        dynamic properties = item["properties"];

                        // Extract name - check if property exists using try/catch
                        try
                        {
                            if (properties.ContainsKey("name"))
                            {
                                name = (item["properties"] as Dictionary<string, object>).ToDictionary(x => x.Key, x => (x.Value as IEnumerable<object>).Cast<Dictionary<string, object>>().ToList()[0]["value"])["name"].ToString();
                               
                            }
                           
                        }
                        catch { /* Property doesn't exist */ }

                        // Extract nodeType
                        try
                        {
                            if (properties["nodeType"] != null)
                            {
                                nodeType = (item["properties"] as Dictionary<string, object>).ToDictionary(x => x.Key, x => (x.Value as IEnumerable<object>).Cast<Dictionary<string, object>>().ToList()[0]["value"])["nodeType"].ToString();

                            }
                        }
                        catch { /* Property doesn't exist */ }

                        // Extract createdAt
                        try
                        {
                            if (properties["createdAt"] != null && properties["createdAt"].Count > 0)
                            {
                                dynamic createdAtValue = properties["createdAt"][0]["value"];
                                string dateString = createdAtValue.ToString();
                                if (DateTime.TryParse(dateString, out var parsedDate))
                                {
                                    createdAt = parsedDate;
                                }
                            }
                        }
                        catch { /* Property doesn't exist */ }
                    }

                    var node = new Node
                    {
                        Id = id,
                        Name = name,
                        NodeType = nodeType,
                        CreatedAt = createdAt
                    };

                    nodes.Add(node);
                }
                catch (Exception ex)
                {
                    // Log the exception and continue with the next item
                    Console.WriteLine($"Error parsing node: {ex.Message}");
                }
            }

            return nodes;
        }



        public async Task<Node> CreateNodeAsync(Node node)
        {
            // Store in Cosmos DB
            node.Id = Guid.NewGuid().ToString();
            //await _container.CreateItemAsync(node, new PartitionKey(node.Id));
            var gremlinQuery = $"g.addV('node').property('id', '{node.Id}').property('name', '{node.Name}').property('nodeType', '{node.NodeType}').property('pkey','1')";
            await _gremlinClient.SubmitAsync<dynamic>(gremlinQuery);
            return node;
        }
        public async Task<Edge> CreateEdgeAsync(Edge edge)
        {
            // Store in Cosmos DB
            await _container.CreateItemAsync(edge, new PartitionKey(edge.Id));
            var gremlinQuery = $"g.addE('edge').property('id', '{edge.Id}').property('source', '{edge.Source}').property('target', '{edge.Target}')";
            await _gremlinClient.SubmitAsync<dynamic>(gremlinQuery);
            return edge;
        }
    }
}


