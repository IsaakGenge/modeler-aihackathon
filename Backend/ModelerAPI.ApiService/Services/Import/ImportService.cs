using Microsoft.Extensions.Logging;
using ModelerAPI.ApiService.Models;
using ModelerAPI.ApiService.Services.Export;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;

namespace ModelerAPI.ApiService.Services.Import
{
    public interface IImportService
    {
        /// <summary>
        /// Imports a graph from a JSON string, creating a new graph with a new ID
        /// </summary>
        /// <param name="jsonData">JSON string containing the graph export data</param>
        /// <param name="newGraphName">Optional new name for the imported graph (uses original if not specified)</param>
        /// <returns>The ID of the newly created graph</returns>
        Task<string> ImportGraphFromJsonAsync(string jsonData, string newGraphName = null);

        /// <summary>
        /// Imports a graph from a GraphExport object, creating a new graph with a new ID
        /// </summary>
        /// <param name="graphExport">Object containing graph, nodes and edges data</param>
        /// <param name="newGraphName">Optional new name for the imported graph (uses original if not specified)</param>
        /// <returns>The ID of the newly created graph and summary of imported items</returns>
        Task<(string GraphId, ImportSummary Summary)> ImportGraphAsync(GraphExport graphExport, string newGraphName = null);
    }

    public class ImportService : IImportService
    {
        private readonly ICosmosService _cosmosService;
        private readonly ILogger<ImportService> _logger;

        public ImportService(ICosmosService cosmosService, ILogger<ImportService> logger)
        {
            _cosmosService = cosmosService ?? throw new ArgumentNullException(nameof(cosmosService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<string> ImportGraphFromJsonAsync(string jsonData, string newGraphName = null)
        {
            try
            {
                _logger.LogInformation("Importing graph from JSON data");

                if (string.IsNullOrEmpty(jsonData))
                {
                    throw new ArgumentException("JSON data cannot be empty or null");
                }

                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                var graphExport = JsonSerializer.Deserialize<GraphExport>(jsonData, options);

                if (graphExport == null)
                {
                    throw new ArgumentException("Failed to deserialize JSON data to GraphExport");
                }

                var (graphId, _) = await ImportGraphAsync(graphExport, newGraphName);
                return graphId;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Error parsing JSON data for import: {Message}", ex.Message);
                throw new ArgumentException($"Invalid JSON format: {ex.Message}", ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing graph from JSON: {Message}", ex.Message);
                throw;
            }
        }

        public async Task<(string GraphId, ImportSummary Summary)> ImportGraphAsync(GraphExport graphExport, string newGraphName = null)
        {
            if (graphExport == null || graphExport.Graph == null)
            {
                throw new ArgumentException("GraphExport data cannot be null");
            }

            _logger.LogInformation("Starting graph import process");

            // Generate new IDs
            var oldToNewIdMap = new Dictionary<string, string>();

            // Create a new graph with a new ID
            var oldGraphId = graphExport.Graph.Id;
            var newGraphId = Guid.NewGuid().ToString();

            // Store mapping from old to new ID
            oldToNewIdMap[oldGraphId] = newGraphId;

            var newGraph = new Graph
            {
                Id = newGraphId,
                Name = string.IsNullOrEmpty(newGraphName) ? $"Import of {graphExport.Graph.Name}" : newGraphName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DocumentType = "Graph",
                PartitionKey = newGraphId // Set partition key to match ID
            };

            _logger.LogInformation("Creating new graph with ID: {Id}, Name: {Name}", newGraph.Id, newGraph.Name);

            try
            {
                await _cosmosService.CreateItemAsync(newGraph, newGraph.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create graph: {Message}", ex.Message);
                throw new ApplicationException("Failed to create the graph in the database", ex);
            }

            // Import nodes with new IDs and updated GraphId
            var importedNodes = new List<Node>();
            var nodeIdMap = new Dictionary<string, string>();

            foreach (var originalNode in graphExport.Nodes)
            {
                var oldNodeId = originalNode.Id;

                // Create a new node with updated properties
                var newNode = new Node
                {
                    Name = originalNode.Name,
                    NodeType = originalNode.NodeType,
                    GraphId = newGraphId,
                    CreatedAt = DateTime.UtcNow,
                    PositionX = originalNode.PositionX,
                    PositionY = originalNode.PositionY,
                    Properties = new Dictionary<string, object>()
                };

                // Copy original properties that aren't system properties
                if (originalNode.Properties != null)
                {
                    foreach (var prop in originalNode.Properties)
                    {
                        if (!IsSystemProperty(prop.Key))
                        {
                            newNode.Properties[prop.Key] = prop.Value;
                        }
                    }
                }

                // Add metadata about the import
                newNode.Properties["ImportedFrom"] = oldNodeId;
                newNode.Properties["ImportedAt"] = DateTime.UtcNow.ToString("o");

                importedNodes.Add(newNode);
                nodeIdMap[oldNodeId] = newNode.Id; // Map old ID to new ID
            }

            // Use bulk operation to create nodes
            var createdNodes = await _cosmosService.BatchCreateNodesAsync(importedNodes);

            // Update the node ID map with the actual IDs assigned by the database
            foreach (var createdNode in createdNodes)
            {
                if (!string.IsNullOrEmpty(createdNode.Id))
                {
                    nodeIdMap[createdNode.Properties["ImportedFrom"].ToString()] = createdNode.Id;
                }
            }

            // Import edges with new IDs, updated source/target node IDs, and updated GraphId
            var importedEdges = new List<Edge>();

            foreach (var originalEdge in graphExport.Edges)
            {
                // Skip edges where source or target nodes weren't successfully imported
                if (!nodeIdMap.TryGetValue(originalEdge.Source, out var newSourceId) ||
                    !nodeIdMap.TryGetValue(originalEdge.Target, out var newTargetId))
                {
                    _logger.LogWarning("Skipping edge {EdgeId} - source or target node not found in import", originalEdge.Id);
                    continue;
                }

                // Create a new edge connecting the newly created nodes
                var newEdge = new Edge
                {
                    Source = newSourceId,
                    Target = newTargetId,
                    EdgeType = originalEdge.EdgeType,
                    GraphId = newGraphId,
                    CreatedAt = DateTime.UtcNow,
                    Properties = new Dictionary<string, object>()
                };

                // Copy original properties that aren't system properties
                if (originalEdge.Properties != null)
                {
                    foreach (var prop in originalEdge.Properties)
                    {
                        if (!IsSystemProperty(prop.Key))
                        {
                            newEdge.Properties[prop.Key] = prop.Value;
                        }
                    }
                }

                // Add metadata about the import
                newEdge.Properties["ImportedFrom"] = originalEdge.Id;
                newEdge.Properties["ImportedAt"] = DateTime.UtcNow.ToString("o");

                importedEdges.Add(newEdge);
            }

            // Use bulk operation to create edges
            var createdEdges = await _cosmosService.BatchCreateEdgesAsync(importedEdges);

            var summary = new ImportSummary
            {
                OriginalGraphId = oldGraphId,
                NewGraphId = newGraphId,
                NodeCount = createdNodes.Count,
                EdgeCount = createdEdges.Count,
                ImportedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Graph import completed. Original: {OriginalId}, New: {NewId}, Nodes: {NodeCount}, Edges: {EdgeCount}",
                oldGraphId, newGraphId, createdNodes.Count, createdEdges.Count);

            return (newGraphId, summary);
        }

        private bool IsSystemProperty(string propertyName)
        {
            string[] systemProperties = new[]
            {
                "id", "pkey", "label", "graphId", "name", "nodeType", "edgeType",
                "createdAt", "positionX", "positionY", "source", "target"
            };

            return Array.Exists(systemProperties, p =>
                string.Equals(p, propertyName, StringComparison.OrdinalIgnoreCase));
        }
    }

    public class ImportSummary
    {
        public string OriginalGraphId { get; set; }
        public string NewGraphId { get; set; }
        public int NodeCount { get; set; }
        public int EdgeCount { get; set; }
        public DateTime ImportedAt { get; set; }
    }
}
