using Gremlin.Net.Driver;
using Gremlin.Net.Driver.Exceptions;
using Gremlin.Net.Structure.IO.GraphSON;
using Microsoft.Azure.Cosmos;
using ModelerAPI.ApiService.Models;
using System.Collections.ObjectModel;

namespace ModelerAPI.ApiService.Services
{
    public class CosmosService : ICosmosService
    {
        private readonly CosmosClient CosmosClient;
        private readonly ILogger<CosmosService> Logger;
        private readonly string DatabaseName;
        private readonly string ContianerName;
        private readonly GremlinClient GremlinClient;

        public CosmosService(IConfiguration configuration, ILogger<CosmosService> logger)
        {
            // Initialize existing properties
            Logger = logger;
            var cosmosConnectionString = configuration["CosmosDB:ConnectionString"];
            DatabaseName = configuration["CosmosDB:DatabaseName"];
            ContianerName = configuration["CosmosDB:ContainerName"];

            // Initialize CosmosClient
            CosmosClient = new CosmosClient(cosmosConnectionString);


            var gremlinHostname = configuration["CosmosDB:GremlinHostname"];
            var gremlinPort = int.Parse(configuration["CosmosDB:GremlinPort"] ?? "443");           
            var gremlinPassword = configuration["CosmosDB:GremlinPassword"];
            var gremlinUsername = configuration["CosmosDB:GremlinUsername"];

            var server = new GremlinServer(hostname: gremlinHostname,port: gremlinPort,username: gremlinUsername,password: gremlinPassword);

            var messageSerializer = new GraphSON2MessageSerializer();
            GremlinClient = new GremlinClient(server, messageSerializer);

            Logger.LogInformation("GremlinClient initialized successfully.");
        }

        // Helper method to execute Gremlin queries safely
        private async Task<IReadOnlyCollection<dynamic>> ExecuteGremlinQueryAsync(string query)
        {
            try
            {
                Logger.LogDebug("Executing Gremlin query: {Query}", query);
                var result = await GremlinClient.SubmitAsync<dynamic>(query);
                return result;
            }
            catch (ResponseException ex)
            {
                Logger.LogError(ex, "Gremlin query execution failed: {Message}", ex.Message);
                throw;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Unexpected error executing Gremlin query: {Message}", ex.Message);
                throw;
            }
        }

        #region Existing Node and Edge Methods
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
            var gremlinQuery = $"g.V('{edge.Target}').addE('{edge.EdgeType}').property('id', '{edge.Id}').property('pkey','1').to(g.V('{edge.Source}'))";
            await GremlinClient.SubmitAsync<dynamic>(gremlinQuery);
            return edge;
        }

        public async Task<bool> DeleteNodeAsync(string id)
        {
            try
            {
                // Delete the node using Gremlin query
                string gremlinQuery = $"g.V('{id}').drop()";
                await GremlinClient.SubmitAsync<dynamic>(gremlinQuery);
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting node: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> DeleteEdgeAsync(string id)
        {
            try
            {
                // Delete the edge using Gremlin query
                var gremlinQuery = $"g.E('{id}').drop()";
                await GremlinClient.SubmitAsync<dynamic>(gremlinQuery);
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting edge: {ex.Message}");
                return false;
            }
        }
        #endregion

        #region Generic Cosmos DB Operations

        /// <summary>
        /// Retrieves an item from Cosmos DB by its ID and partition key
        /// </summary>
        /// <typeparam name="T">The type of item to retrieve</typeparam>
        /// <param name="databaseName">The name of the database</param>
        /// <param name="containerName">The name of the container</param>
        /// <param name="id">The unique identifier of the item</param>
        /// <param name="partitionKey">The partition key value</param>
        /// <returns>The retrieved item or null if not found</returns>
        public async Task<T> GetItemAsync<T>(string databaseName, string containerName, string id, string partitionKey)
        {
            try
            {
                var container = CosmosClient.GetContainer(databaseName, containerName);
                var response = await container.ReadItemAsync<T>(id, new PartitionKey(partitionKey));
                return response.Resource;
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                Logger.LogWarning("Item with id {Id} not found in container {Container}", id, containerName);
                return default;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error retrieving item with id {Id} from container {Container}", id, containerName);
                throw;
            }
        }

        /// <summary>
        /// Creates a new item in Cosmos DB
        /// </summary>
        /// <typeparam name="T">The type of item to create</typeparam>
        /// <param name="databaseName">The name of the database</param>
        /// <param name="containerName">The name of the container</param>
        /// <param name="item">The item to create</param>
        /// <param name="partitionKey">The partition key value</param>
        /// <returns>The created item</returns>
        public async Task<T> CreateItemAsync<T>(string databaseName, string containerName, T item, string partitionKey)
        {
            try
            {
                var container = CosmosClient.GetContainer(databaseName, containerName);
                var response = await container.CreateItemAsync(item, new PartitionKey(partitionKey));
                return response.Resource;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error creating item in container {Container}", containerName);
                throw;
            }
        }

        /// <summary>
        /// Updates an existing item or inserts it if it doesn't exist in Cosmos DB
        /// </summary>
        /// <typeparam name="T">The type of item to upsert</typeparam>
        /// <param name="databaseName">The name of the database</param>
        /// <param name="containerName">The name of the container</param>
        /// <param name="item">The item to upsert</param>
        /// <param name="partitionKey">The partition key value</param>
        /// <returns>The upserted item</returns>
        public async Task<T> UpsertItemAsync<T>(string databaseName, string containerName, T item, string partitionKey)
        {
            try
            {
                var container = CosmosClient.GetContainer(databaseName, containerName);
                var response = await container.UpsertItemAsync(item, new PartitionKey(partitionKey));
                return response.Resource;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error upserting item in container {Container}", containerName);
                throw;
            }
        }

        /// <summary>
        /// Deletes an item from Cosmos DB by its ID and partition key
        /// </summary>
        /// <param name="databaseName">The name of the database</param>
        /// <param name="containerName">The name of the container</param>
        /// <param name="id">The unique identifier of the item</param>
        /// <param name="partitionKey">The partition key value</param>
        /// <returns>True if deletion was successful, otherwise false</returns>
        public async Task<bool> DeleteItemAsync(string databaseName, string containerName, string id, string partitionKey)
        {
            try
            {
                var container = CosmosClient.GetContainer(databaseName, containerName);
                await container.DeleteItemAsync<dynamic>(id, new PartitionKey(partitionKey));
                return true;
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                Logger.LogWarning("Item with id {Id} not found for deletion in container {Container}", id, containerName);
                return false;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error deleting item with id {Id} from container {Container}", id, containerName);
                throw;
            }
        }

        /// <summary>
        /// Executes a query against a Cosmos DB container
        /// </summary>
        /// <typeparam name="T">The type of items to retrieve</typeparam>
        /// <param name="databaseName">The name of the database</param>
        /// <param name="containerName">The name of the container</param>
        /// <param name="queryString">The SQL query string</param>
        /// <returns>An enumerable collection of items matching the query</returns>
        public async Task<IEnumerable<T>> QueryItemsAsync<T>(string databaseName, string containerName, string queryString)
        {
            try
            {
                var container = CosmosClient.GetContainer(databaseName, containerName);
                var query = container.GetItemQueryIterator<T>(new QueryDefinition(queryString));

                var results = new List<T>();
                while (query.HasMoreResults)
                {
                    var response = await query.ReadNextAsync();
                    results.AddRange(response);
                }

                return results;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error executing query in container {Container}: {Query}", containerName, queryString);
                throw;
            }
        }

        #endregion

        // Implement IDisposable pattern to properly dispose of the GremlinClient
        public void Dispose()
        {
            GremlinClient?.Dispose();
            CosmosClient?.Dispose();
        }
    }
}
