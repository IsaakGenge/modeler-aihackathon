using Gremlin.Net.Driver;
using Gremlin.Net.Driver.Exceptions;
using Gremlin.Net.Structure.IO.GraphSON;
using Microsoft.Azure.Cosmos;
using ModelerAPI.ApiService.Models;
using System;

namespace ModelerAPI.ApiService.Services.Cosmos
{
    public class CosmosService : ICosmosService
    {
        private readonly CosmosClient CosmosClient;
        private readonly ILogger<CosmosService> Logger;
        private readonly string DatabaseName;
        private readonly string ContianerName;
        private readonly GremlinClient GremlinClient;
        private readonly CosmosParseHelper ParseHelper;

        public CosmosService(IConfiguration configuration, ILogger<CosmosService> logger, IWebHostEnvironment environment)
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


            bool enableSsl = !environment.IsDevelopment();
            var server = new GremlinServer(hostname: gremlinHostname, port: gremlinPort, username: gremlinUsername, password: gremlinPassword, enableSsl: enableSsl);

            var messageSerializer = new GraphSON2MessageSerializer(new CustomGraphSON2Reader());

            // Create the Gremlin client with settings
            GremlinClient = new GremlinClient(server, messageSerializer);

            // Initialize the parse helper
            ParseHelper = new CosmosParseHelper(logger);

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
        /// <summary>
        /// Serializes a property value for use in Gremlin queries based on its type
        /// </summary>
        /// <param name="value">The value to serialize</param>
        /// <returns>A string representation of the value suitable for Gremlin queries</returns>
        private string SerializePropertyValue(object value)
        {
            if (value == null)
                return "null";

            // Log the type for debugging
            Logger.LogDebug("Serializing property value of type: {Type} with value: {Value}",
                value.GetType().Name, value);

            switch (value)
            {
                case string s:
                    return $"'{SanitizeGremlinValue(s)}'";
                case DateTime dt:
                    return $"'{dt:o}'";
                case bool b:
                    return b ? "true" : "false"; // Boolean values without quotes
                case int or long or short or byte or sbyte or uint or ulong or ushort:
                case float or double or decimal:
                    // Numeric values without quotes
                    return value.ToString().Replace(",", "."); // Ensure decimal point is a period
                case DateTimeOffset dto:
                    return $"'{dto:o}'";
                case DateOnly dateOnly:
                    return $"'{dateOnly:yyyy-MM-dd}'";
                case TimeOnly timeOnly:
                    return $"'{timeOnly:HH:mm:ss.fffffff}'";
                default:
                    if (value is System.Text.Json.JsonElement jsonElement)
                    {
                        // Handle JsonElement type which might come from System.Text.Json
                        switch (jsonElement.ValueKind)
                        {
                            case System.Text.Json.JsonValueKind.String:
                                return $"'{SanitizeGremlinValue(jsonElement.GetString() ?? "")}'";
                            case System.Text.Json.JsonValueKind.Number:
                                return jsonElement.ToString(); // No quotes for numbers
                            case System.Text.Json.JsonValueKind.True:
                                return "true";
                            case System.Text.Json.JsonValueKind.False:
                                return "false";
                            case System.Text.Json.JsonValueKind.Null:
                                return "null";
                            case System.Text.Json.JsonValueKind.Object:
                            case System.Text.Json.JsonValueKind.Array:
                                // For objects and arrays, we need to serialize to JSON
                                var jsonVal = jsonElement.ToString();
                                return $"'{SanitizeGremlinValue(jsonVal)}'";
                            default:
                                return $"'{SanitizeGremlinValue(jsonElement.ToString())}'";
                        }
                    }

                    // For other complex objects, serialize to JSON
                    var jsonOptions = new System.Text.Json.JsonSerializerOptions
                    {
                        WriteIndented = false,
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
                    };
                    var json = System.Text.Json.JsonSerializer.Serialize(value, jsonOptions);
                    return $"'{SanitizeGremlinValue(json)}'";
            }
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
                var node = ParseHelper.ParseNodeFromVertex(item, graphId);
                if (node != null)
                {
                    nodes.Add(node);
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
                var edge = ParseHelper.ParseEdgeFromEdge(item, graphId);
                if (edge != null)
                {
                    edges.Add(edge);
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

            if (node.PositionX.HasValue && node.PositionY.HasValue)
            {
                gremlinQuery += $".property('positionX', {node.PositionX})" +
                              $".property('positionY', {node.PositionY})";
            }
            else
            {
                // Add random position if none is specified
                var random = new Random();
                var x = random.Next(-100, 100);
                var y = random.Next(-100, 100);
                gremlinQuery += $".property('positionX', {x})" +
                              $".property('positionY', {y})";
            }

            // Add custom properties
            if (node.Properties != null)
            {
                foreach (var prop in node.Properties)
                {
                    // Skip null properties
                    if (prop.Value == null)
                        continue;

                    var sanitizedKey = SanitizeGremlinValue(prop.Key);

                    // Serialize the property value based on its type
                    string propertyValue = SerializePropertyValue(prop.Value);
                    gremlinQuery += $".property('{sanitizedKey}', {propertyValue})";
                }
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

            // Add custom properties
            if (edge.Properties != null)
            {
                foreach (var prop in edge.Properties)
                {
                    // Skip null properties
                    if (prop.Value == null)
                        continue;

                    var sanitizedKey = SanitizeGremlinValue(prop.Key);

                    // Serialize the property value based on its type
                    string propertyValue = SerializePropertyValue(prop.Value);
                    gremlinQuery += $".property('{sanitizedKey}', {propertyValue})";
                }
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

        public async Task<Node> UpdateNodeAsync(Node node)
        {
            try
            {
                if (string.IsNullOrEmpty(node.Id))
                {
                    throw new ArgumentException("Node ID is required for update");
                }

                if (string.IsNullOrEmpty(node.GraphId))
                {
                    throw new ArgumentException("GraphId is required for nodes");
                }

                // Sanitize inputs to prevent Gremlin injection
                var sanitizedId = SanitizeGremlinValue(node.Id);
                var sanitizedName = SanitizeGremlinValue(node.Name);
                var sanitizedGraphId = SanitizeGremlinValue(node.GraphId);
                var sanitizedLabel = SanitizeGremlinValue(node.NodeType);

                // First, update basic properties
                var gremlinQuery = $"g.V('{sanitizedId}')" +
                                  $".property('name', '{sanitizedName}')" +
                                  $".property('graphId', '{sanitizedGraphId}')"+
                                  $".property('label', '{sanitizedLabel}')";

                if (node.PositionX.HasValue && node.PositionY.HasValue)
                {
                    gremlinQuery += $".property('positionX', {node.PositionX})" +
                                  $".property('positionY', {node.PositionY})";
                }

                await ExecuteGremlinQueryAsync(gremlinQuery);

                // Get current node properties
                var currentNodeQuery = $"g.V('{sanitizedId}').valueMap()";
                var currentNodeResult = await ExecuteGremlinQueryAsync(currentNodeQuery);

                // Parse the current node properties
                var currentProperties = new Dictionary<string, object>();
                if (currentNodeResult.Count > 0)
                {
                    var valueMap = currentNodeResult.First();
                    var parsedProperties = ParseHelper.ExtractCustomProperties(valueMap);
                    foreach (var prop in parsedProperties)
                    {
                        currentProperties[prop.Key] = prop.Value;
                    }
                }

                // Get updated properties (or empty dictionary if null)
                var updatedProperties = node.Properties ?? new Dictionary<string, object>();

                // IMPORTANT: FIRST REMOVE ALL EXISTING CUSTOM PROPERTIES
                // This ensures a clean slate before adding the updated properties
                foreach (var currentProp in currentProperties.Keys.ToList()) // Use ToList() to avoid collection modified exception
                {
                    // Skip system properties
                    if (new[] { "id", "name", "graphId", "pkey", "positionX", "positionY", "createdAt" }
                        .Contains(currentProp, StringComparer.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    // Remove ALL custom properties
                    var removePropertyQuery = $"g.V('{sanitizedId}').properties('{SanitizeGremlinValue(currentProp)}').drop()";
                    await ExecuteGremlinQueryAsync(removePropertyQuery);
                }

                // Now add only the properties that should exist
                if (updatedProperties.Count > 0)
                {
                    foreach (var prop in updatedProperties)
                    {
                        // Skip null properties
                        if (prop.Value == null)
                            continue;

                        var sanitizedKey = SanitizeGremlinValue(prop.Key);
                        string propertyValue = SerializePropertyValue(prop.Value);

                        var updatePropertyQuery = $"g.V('{sanitizedId}').property('{sanitizedKey}', {propertyValue})";
                        await ExecuteGremlinQueryAsync(updatePropertyQuery);
                    }
                }

                // Return the updated node with all its properties
                var updatedNodeQuery = $"g.V('{sanitizedId}')";
                var updatedNodeResult = await ExecuteGremlinQueryAsync(updatedNodeQuery);

                // Final verification
                if (updatedNodeResult.Count > 0)
                {
                    var updatedNode = ParseHelper.ParseNodeFromVertex(updatedNodeResult.First(), node.GraphId);
                    return updatedNode;
                }

                return node; // Fallback to returning the input node if we can't get the updated one
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error updating node: {Message}", ex.Message);
                throw;
            }
        }

        public async Task<Edge> UpdateEdgeAsync(Edge edge)
        {
            try
            {
                if (string.IsNullOrEmpty(edge.Id))
                {
                    throw new ArgumentException("Edge ID is required for update");
                }

                if (string.IsNullOrEmpty(edge.GraphId))
                {
                    throw new ArgumentException("GraphId is required for edges");
                }

                // Sanitize inputs to prevent Gremlin injection
                var sanitizedId = SanitizeGremlinValue(edge.Id);
                var sanitizedGraphId = SanitizeGremlinValue(edge.GraphId);
                var sanitizedEdgeType = SanitizeGremlinValue(edge.EdgeType);


                // Update basic properties
                var gremlinQuery = $"g.E('{sanitizedId}')" +
                          $".property('graphId', '{sanitizedGraphId}')" +                         
                          $".property('label', '{sanitizedEdgeType}')";

                await ExecuteGremlinQueryAsync(gremlinQuery);

                // Get current edge properties
                var currentEdgeQuery = $"g.E('{sanitizedId}').valueMap()";
                var currentEdgeResult = await ExecuteGremlinQueryAsync(currentEdgeQuery);

                // Parse the current edge properties
                var currentProperties = new Dictionary<string, object>();
                if (currentEdgeResult.Count > 0)
                {
                    var valueMap = currentEdgeResult.First();
                    var parsedProperties = ParseHelper.ExtractCustomProperties(valueMap);
                    foreach (var prop in parsedProperties)
                    {
                        currentProperties[prop.Key] = prop.Value;
                    }
                }

                // Get updated properties (or empty dictionary if null)
                var updatedProperties = edge.Properties ?? new Dictionary<string, object>();

                // IMPORTANT: FIRST REMOVE ALL EXISTING CUSTOM PROPERTIES
                // This ensures a clean slate before adding the updated properties
                foreach (var currentProp in currentProperties.Keys.ToList()) // Use ToList() to avoid collection modified exception
                {
                    // Skip system properties
                    if (new[] { "id", "graphId", "pkey", "createdAt" }
                        .Contains(currentProp, StringComparer.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    // Remove ALL custom properties
                    var removePropertyQuery = $"g.E('{sanitizedId}').properties('{SanitizeGremlinValue(currentProp)}').drop()";
                    await ExecuteGremlinQueryAsync(removePropertyQuery);
                }

                // Now add only the properties that should exist
                if (updatedProperties.Count > 0)
                {
                    foreach (var prop in updatedProperties)
                    {
                        // Skip null properties
                        if (prop.Value == null)
                            continue;

                        var sanitizedKey = SanitizeGremlinValue(prop.Key);
                        string propertyValue = SerializePropertyValue(prop.Value);

                        var updatePropertyQuery = $"g.E('{sanitizedId}').property('{sanitizedKey}', {propertyValue})";
                        await ExecuteGremlinQueryAsync(updatePropertyQuery);
                    }
                }

                // Return the updated edge with all its properties
                var updatedEdgeQuery = $"g.E('{sanitizedId}')";
                var updatedEdgeResult = await ExecuteGremlinQueryAsync(updatedEdgeQuery);

                // Final verification
                if (updatedEdgeResult.Count > 0)
                {
                    var updatedEdge = ParseHelper.ParseEdgeFromEdge(updatedEdgeResult.First(), edge.GraphId);
                    return updatedEdge;
                }

                return edge; // Fallback to returning the input edge if we can't get the updated one
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error updating edge: {Message}", ex.Message);
                throw;
            }
        }






        public async Task<bool> UpdateNodePositionsAsync(string nodeId, double x, double y)
        {
            try
            {
                // Sanitize the input
                var sanitizedId = SanitizeGremlinValue(nodeId);

                // Gremlin query to update the node's position properties
                var gremlinQuery = $"g.V('{sanitizedId}')" +
                                  $".property('positionX', {x})" +
                                  $".property('positionY', {y})";

                await ExecuteGremlinQueryAsync(gremlinQuery);
                return true;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error updating node position: {Message}", ex.Message);
                return false;
            }
        }

        // Batch update method for updating multiple node positions at once
        public async Task<bool> BatchUpdateNodePositionsAsync(Dictionary<string, (double x, double y)> nodePositions)
        {
            try
            {
                foreach (var position in nodePositions)
                {
                    var sanitizedId = SanitizeGremlinValue(position.Key);
                    var x = position.Value.x;
                    var y = position.Value.y;

                    Logger.LogDebug("Updating position for node {Id}: X={X}, Y={Y}", sanitizedId, x, y);

                    var gremlinQuery = $"g.V('{sanitizedId}')" +
                                      $".property('positionX', {x})" +
                                      $".property('positionY', {y})";

                    await ExecuteGremlinQueryAsync(gremlinQuery);
                }

                foreach (var position in nodePositions)
                {
                    // After saving, verify the position was stored correctly
                    var verifyQuery = $"g.V('{SanitizeGremlinValue(position.Key)}').valueMap()";
                    var verifyResult = await ExecuteGremlinQueryAsync(verifyQuery);
                    Logger.LogInformation("Node {Id} after position update: {Data}", position.Key, verifyResult);
                }

                return true;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error batch updating node positions: {Message}", ex.Message);
                return false;
            }
        }

        public async Task<bool> UpdateNodePropertiesAsync(string nodeId, Dictionary<string, object> properties)
        {
            try
            {
                // Sanitize the input
                var sanitizedId = SanitizeGremlinValue(nodeId);

                // Execute each property update as a separate query for best compatibility
                foreach (var property in properties)
                {
                    var sanitizedKey = SanitizeGremlinValue(property.Key);
                    var propertyValue = SerializePropertyValue(property.Value);

                    var gremlinQuery = $"g.V('{sanitizedId}').property('{sanitizedKey}', {propertyValue})";
                    await ExecuteGremlinQueryAsync(gremlinQuery);
                }

                return true;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error updating node properties: {Message}", ex.Message);
                return false;
            }
        }

        // Add a method to update edge properties
        public async Task<bool> UpdateEdgePropertiesAsync(string edgeId, Dictionary<string, object> properties)
        {
            try
            {
                // Sanitize the input
                var sanitizedId = SanitizeGremlinValue(edgeId);

                // Execute each property update as a separate query for best compatibility
                foreach (var property in properties)
                {
                    var sanitizedKey = SanitizeGremlinValue(property.Key);
                    var propertyValue = SerializePropertyValue(property.Value);

                    var gremlinQuery = $"g.E('{sanitizedId}').property('{sanitizedKey}', {propertyValue})";
                    await ExecuteGremlinQueryAsync(gremlinQuery);
                }

                return true;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error updating edge properties: {Message}", ex.Message);
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
