using Gremlin.Net.Driver;
using Gremlin.Net.Driver.Exceptions;
using Gremlin.Net.Structure.IO.GraphSON;
using Microsoft.Azure.Cosmos;
using ModelerAPI.ApiService.Models;
using System.Collections.ObjectModel;

namespace ModelerAPI.ApiService.Services.Cosmos
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
        /// <summary>
        /// Sanitizes a string value to prevent Gremlin injection attacks by escaping single quotes
        /// and removing potentially dangerous characters
        /// </summary>
        /// <param name="value">The input string to sanitize</param>
        /// <returns>A sanitized string safe for use in Gremlin queries</returns>
        private string SanitizeGremlinValue(string value)
        {
            if (string.IsNullOrEmpty(value))
                return string.Empty;

            // Escape single quotes by doubling them (this is standard SQL-like escaping)
            string sanitized = value.Replace("'", "''");

            // Remove any characters that could potentially break out of string context
            // or otherwise manipulate the query structure
            sanitized = sanitized
                .Replace("\r", "")
                .Replace("\n", "")
                .Replace(";", "")  // Semicolons could be used to chain commands
                .Replace("\\", ""); // Backslashes could be used for escaping

            return sanitized;
        }


        #region Existing Node and Edge Methods
        public async Task<List<Node>> GetNodes(string graphId = null)
        {
            string gremlinQuery;

            // If graphId is provided, filter by it using the pkey property
            if (!string.IsNullOrEmpty(graphId))
            {
                gremlinQuery = $"g.V().has('pkey', '{SanitizeGremlinValue(graphId)}')";
            }
            else
            {
                // Otherwise, get all nodes
                gremlinQuery = "g.V()";
            }

            var result = await ExecuteGremlinQueryAsync(gremlinQuery);
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
                    string nodeGraphId = graphId ?? ""; // Default to empty if not provided

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

                        // Extract graphId if it wasn't provided as a parameter
                        if (string.IsNullOrEmpty(graphId))
                        {
                            try
                            {
                                if (properties["graphId"] != null && properties["graphId"].Count > 0)
                                {
                                    nodeGraphId = properties["graphId"][0]["value"].ToString();
                                }
                                else if (properties["pkey"] != null && properties["pkey"].Count > 0)
                                {
                                    // Fall back to pkey if graphId is not explicitly stored
                                    nodeGraphId = properties["pkey"][0]["value"].ToString();
                                }
                            }
                            catch { /* Property doesn't exist */ }
                        }
                    }

                    var node = new Node
                    {
                        Id = id,
                        Name = name,
                        NodeType = nodeType,
                        CreatedAt = createdAt,
                        GraphId = nodeGraphId
                    };

                    nodes.Add(node);
                }
                catch (Exception ex)
                {
                    // Log the exception and continue with the next item
                    Logger.LogError(ex, "Error parsing node: {Message}", ex.Message);
                }
            }

            return nodes;
        }

        public async Task<List<Edge>> GetEdges(string graphId = null)
        {
            string gremlinQuery;

            // If graphId is provided, filter by it using the pkey property
            if (!string.IsNullOrEmpty(graphId))
            {
                gremlinQuery = $"g.E().has('pkey', '{SanitizeGremlinValue(graphId)}')";
            }
            else
            {
                // Otherwise, get all edges
                gremlinQuery = "g.E()";
            }

            var result = await ExecuteGremlinQueryAsync(gremlinQuery);
            var edges = new List<Edge>();

            foreach (var item in result)
            {
                try
                {
                    // Use indexer syntax for dynamic objects
                    string id = item["id"].ToString();
                    string source = item["outV"].ToString();  // Source is the outV (outgoing vertex)
                    string target = item["inV"].ToString();   // Target is the inV (incoming vertex)
                    string edgeType = item["label"].ToString(); // Get the label as edgeType
                    DateTime createdAt = DateTime.UtcNow;
                    string edgeGraphId = graphId ?? ""; // Default to empty if not provided

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

                        // Extract graphId if it wasn't provided as a parameter
                        if (string.IsNullOrEmpty(graphId))
                        {
                            try
                            {
                                if (properties.ContainsKey("graphId"))
                                {
                                    var propsDict = item["properties"] as Dictionary<string, object>;
                                    if (propsDict != null && propsDict.ContainsKey("graphId"))
                                    {
                                        var graphIdValue = (propsDict["graphId"] as IEnumerable<object>)
                                            ?.Cast<Dictionary<string, object>>()
                                            ?.FirstOrDefault()?["value"];

                                        if (graphIdValue != null)
                                        {
                                            edgeGraphId = graphIdValue.ToString();
                                        }
                                    }
                                }
                                else if (properties.ContainsKey("pkey"))
                                {
                                    // Fall back to pkey if graphId is not explicitly stored
                                    var propsDict = item["properties"] as Dictionary<string, object>;
                                    if (propsDict != null && propsDict.ContainsKey("pkey"))
                                    {
                                        var pkeyValue = (propsDict["pkey"] as IEnumerable<object>)
                                            ?.Cast<Dictionary<string, object>>()
                                            ?.FirstOrDefault()?["value"];

                                        if (pkeyValue != null)
                                        {
                                            edgeGraphId = pkeyValue.ToString();
                                        }
                                    }
                                }
                            }
                            catch { /* Property doesn't exist or has unexpected format */ }
                        }
                    }

                    var edge = new Edge
                    {
                        Id = id,
                        Source = source,
                        Target = target,
                        EdgeType = edgeType,
                        CreatedAt = createdAt,
                        GraphId = edgeGraphId
                    };

                    edges.Add(edge);
                }
                catch (Exception ex)
                {
                    // Log the exception and continue with the next item
                    Logger.LogError(ex, "Error parsing edge: {Message}", ex.Message);
                }
            }

            return edges;
        }

        public async Task<Node> CreateNodeAsync(Node node)
        {
            // Validate GraphId is present
            if (string.IsNullOrEmpty(node.GraphId))
            {
                throw new ArgumentException("GraphId is required for nodes");
            }

            // Store in Cosmos DB using the NodeType as the vertex label
            node.Id = Guid.NewGuid().ToString();

            // Sanitize inputs to prevent Gremlin injection
            var sanitizedId = SanitizeGremlinValue(node.Id);
            var sanitizedName = SanitizeGremlinValue(node.Name);
            var sanitizedNodeType = SanitizeGremlinValue(node.NodeType);
            var sanitizedGraphId = SanitizeGremlinValue(node.GraphId);

            // Use the NodeType property as the vertex label, and store GraphId in both graphId and pkey properties
            var gremlinQuery = $"g.addV('{sanitizedNodeType}')" +
                               $".property('id', '{sanitizedId}')" +
                               $".property('name', '{sanitizedName}')" +
                               $".property('graphId', '{sanitizedGraphId}')" +
                               $".property('pkey', '{sanitizedGraphId}')";

            if (node.CreatedAt != default)
            {
                var createdAtFormatted = node.CreatedAt.ToString("o");
                gremlinQuery += $".property('createdAt', '{createdAtFormatted}')";
            }

            await ExecuteGremlinQueryAsync(gremlinQuery);
            return node;
        }

        public async Task<Edge> CreateEdgeAsync(Edge edge)
        {
            // Validate GraphId is present
            if (string.IsNullOrEmpty(edge.GraphId))
            {
                throw new ArgumentException("GraphId is required for edges");
            }

            // Store in Cosmos DB using the EdgeType as the edge label
            edge.Id = Guid.NewGuid().ToString();

            // Sanitize inputs to prevent Gremlin injection
            var sanitizedId = SanitizeGremlinValue(edge.Id);
            var sanitizedSource = SanitizeGremlinValue(edge.Source);
            var sanitizedTarget = SanitizeGremlinValue(edge.Target);
            var sanitizedEdgeType = SanitizeGremlinValue(edge.EdgeType);
            var sanitizedGraphId = SanitizeGremlinValue(edge.GraphId);

            // Use the EdgeType property as the edge label, and store GraphId in both graphId and pkey properties
            var gremlinQuery = $"g.V('{sanitizedSource}').addE('{sanitizedEdgeType}')" +
                              $".property('id', '{sanitizedId}')" +
                              $".property('graphId', '{sanitizedGraphId}')" +
                              $".property('pkey', '{sanitizedGraphId}')";

            if (edge.CreatedAt != default)
            {
                var createdAtFormatted = edge.CreatedAt.ToString("o");
                gremlinQuery += $".property('createdAt', '{createdAtFormatted}')";
            }

            gremlinQuery += $".to(g.V('{sanitizedTarget}'))";

            await ExecuteGremlinQueryAsync(gremlinQuery);
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
        /// <param name="id">The unique identifier of the item</param>
        /// <param name="partitionKey">The partition key value</param>
        /// <returns>The retrieved item or null if not found</returns>
        public async Task<T> GetItemAsync<T>(string id, string partitionKey)
        {
            try
            {
                var container = CosmosClient.GetContainer(DatabaseName, ContianerName);
                var response = await container.ReadItemAsync<T>(id, new PartitionKey(partitionKey));
                return response.Resource;
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                Logger.LogWarning("Item with id {Id} not found in container {Container}", id, ContianerName);
                return default;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error retrieving item with id {Id} from container {Container}", id, ContianerName);
                throw;
            }
        }

        /// <summary>
        /// Creates a new item in Cosmos DB
        /// </summary>
        /// <typeparam name="T">The type of item to create</typeparam>
        /// <param name="item">The item to create</param>
        /// <param name="partitionKey">The partition key value</param>
        /// <returns>The created item</returns>
        public async Task<T> CreateItemAsync<T>(T item, string partitionKey)
        {
            try
            {
                var container = CosmosClient.GetContainer(DatabaseName, ContianerName);

                // Log the item and partition key for debugging
                Logger.LogDebug("Creating item with partition key: {PartitionKey}", partitionKey);

                var response = await container.CreateItemAsync(item, new PartitionKey(partitionKey));
                return response.Resource;
            }
            catch (CosmosException ex)
            {
                Logger.LogError(ex, "Cosmos DB error creating item. Status: {Status}, Message: {Message}",
                    ex.StatusCode, ex.Message);
                throw;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error creating item in container {Container}", ContianerName);
                throw;
            }
        }

        /// <summary>
        /// Updates an existing item or inserts it if it doesn't exist in Cosmos DB
        /// </summary>
        /// <typeparam name="T">The type of item to upsert</typeparam>
        /// <param name="item">The item to upsert</param>
        /// <param name="partitionKey">The partition key value</param>
        /// <returns>The upserted item</returns>
        public async Task<T> UpsertItemAsync<T>(T item, string partitionKey)
        {
            try
            {
                var container = CosmosClient.GetContainer(DatabaseName, ContianerName);
                var response = await container.UpsertItemAsync(item, new PartitionKey(partitionKey));
                return response.Resource;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error upserting item in container {Container}", ContianerName);
                throw;
            }
        }

        /// <summary>
        /// Deletes an item from Cosmos DB by its ID and partition key
        /// </summary>
        /// <param name="id">The unique identifier of the item</param>
        /// <param name="partitionKey">The partition key value</param>
        /// <returns>True if deletion was successful, otherwise false</returns>
        public async Task<bool> DeleteItemAsync(string id, string partitionKey)
        {
            try
            {
                var container = CosmosClient.GetContainer(DatabaseName, ContianerName);
                await container.DeleteItemAsync<dynamic>(id, new PartitionKey(partitionKey));
                return true;
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                Logger.LogWarning("Item with id {Id} not found for deletion in container {Container}", id, ContianerName);
                return false;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error deleting item with id {Id} from container {Container}", id, ContianerName);
                throw;
            }
        }

        /// <summary>
        /// Executes a query against a Cosmos DB container
        /// </summary>
        /// <typeparam name="T">The type of items to retrieve</typeparam>
        /// <param name="queryString">The SQL query string</param>
        /// <returns>An enumerable collection of items matching the query</returns>
        public async Task<IEnumerable<T>> QueryItemsAsync<T>(string queryString)
        {
            try
            {
                var container = CosmosClient.GetContainer(DatabaseName, ContianerName);
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
                Logger.LogError(ex, "Error executing query in container {Container}: {Query}", ContianerName, queryString);
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
