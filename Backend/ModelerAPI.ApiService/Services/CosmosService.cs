using Gremlin.Net.Driver;
using Gremlin.Net.Structure.IO.GraphSON;
using Microsoft.Azure.Cosmos;
using ModelerAPI.ApiService.Models;
namespace ModelerAPI.ApiService.Services
{
    public class CosmosService : ICosmosService
    {
        private readonly CosmosClient CosmosClient;
        private readonly Container Container;
        private readonly GremlinClient GremlinClient;

        public CosmosService()
        {
            // Cosmos DB Emulator connection
            CosmosClient = new CosmosClient("https://localhost:8081", "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==");
            Container = CosmosClient.GetContainer("model", "graph");

            // Gremlin API connection (Cosmos DB Gremlin endpoint)
            var server = new GremlinServer(hostname: "localhost", port: 65400, username: "/dbs/db1/colls/coll1", password: "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==");
            var messageSerializer = new GraphSON2MessageSerializer();
            GremlinClient = new GremlinClient(server, messageSerializer);
        }

        public async Task<List<Node>> GetNodes()
        {
            // Query all nodes regardless of specific label
            var gremlinQuery = "g.V()";
            var result = await GremlinClient.SubmitAsync<dynamic>(gremlinQuery);
            var nodes = new List<Node>();

            foreach (var item in result)
            {
                try
                {
                    // Use indexer syntax for dynamic objects
                    string id = item["id"].ToString();
                    string name = "";
                    string nodeType = item["label"].ToString(); // Get the label as nodeType
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

        public async Task<List<Edge>> GetEdges()
        {
            // Query all edges regardless of specific label
            var gremlinQuery = "g.E()";
            var result = await GremlinClient.SubmitAsync<dynamic>(gremlinQuery);
            var edges = new List<Edge>();

            foreach (var item in result)
            {
                try
                {
                    // Use indexer syntax for dynamic objects
                    string id = item["id"].ToString();
                    string source = item["inV"].ToString();  // Source is the inV (incoming vertex)
                    string target = item["outV"].ToString(); // Target is the outV (outgoing vertex)
                    string edgeType = item["label"].ToString(); // Get the label as edgeType
                    DateTime createdAt = DateTime.UtcNow;

                    // Extract additional properties from the properties collection
                    if (item["properties"] != null)
                    {
                        dynamic properties = item["properties"];

                        // Extract createdAt
                        try
                        {
                            if (properties.ContainsKey("createdAt"))
                            {
                                var propsDict = item["properties"] as Dictionary<string, object>;
                                if (propsDict != null && propsDict.ContainsKey("createdAt"))
                                {
                                    var createdAtValue = (propsDict["createdAt"] as IEnumerable<object>)
                                        ?.Cast<Dictionary<string, object>>()
                                        ?.FirstOrDefault()?["value"];

                                    if (createdAtValue != null)
                                    {
                                        string dateString = createdAtValue.ToString();
                                        if (DateTime.TryParse(dateString, out var parsedDate))
                                        {
                                            createdAt = parsedDate;
                                        }
                                    }
                                }
                            }
                        }
                        catch { /* Property doesn't exist or has unexpected format */ }
                    }

                    var edge = new Edge
                    {
                        Id = id,
                        Source = source,
                        Target = target,
                        EdgeType = edgeType,
                        CreatedAt = createdAt
                    };

                    edges.Add(edge);
                }
                catch (Exception ex)
                {
                    // Log the exception and continue with the next item
                    Console.WriteLine($"Error parsing edge: {ex.Message}");
                }
            }

            return edges;
        }

        public async Task<Node> CreateNodeAsync(Node node)
        {
            // Store in Cosmos DB using the NodeType as the vertex label
            node.Id = Guid.NewGuid().ToString();

            // Use the NodeType property as the vertex label instead of generic 'node'
            var gremlinQuery = $"g.addV('{node.NodeType}').property('id', '{node.Id}').property('name', '{node.Name}').property('pkey','1')";
            await GremlinClient.SubmitAsync<dynamic>(gremlinQuery);
            return node;
        }

        public async Task<Edge> CreateEdgeAsync(Edge edge)
        {
            // Store in Cosmos DB using the EdgeType as the edge label
            edge.Id = Guid.NewGuid().ToString();

            // Use the EdgeType property as the edge label instead of generic 'edge'
            var gremlinQuery = $"g.V('{edge.Source}').addE('{edge.EdgeType}').property('id', '{edge.Id}').property('pkey','1').to(g.V('{edge.Target}'))";
            await GremlinClient.SubmitAsync<dynamic>(gremlinQuery);
            return edge;
        }

    }
}


