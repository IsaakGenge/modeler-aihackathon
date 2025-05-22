using Microsoft.Extensions.Logging;
using ModelerAPI.ApiService.Models;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace ModelerAPI.ApiService.Services.Export
{
    public interface IExportService
    {
        /// <summary>
        /// Exports a graph and all its nodes and edges as JSON
        /// </summary>
        /// <param name="graphId">ID of the graph to export</param>
        /// <returns>A complete graph export object as JSON string</returns>
        Task<string> ExportGraphAsJsonAsync(string graphId);

        /// <summary>
        /// Exports a graph and all its nodes and edges as a structured object
        /// </summary>
        /// <param name="graphId">ID of the graph to export</param>
        /// <returns>A graph export object containing the graph, nodes, and edges</returns>
        Task<GraphExport> ExportGraphAsync(string graphId);
    }

    public class ExportService : IExportService
    {
        private readonly ICosmosService _cosmosService;
        private readonly ILogger<ExportService> _logger;

        public ExportService(ICosmosService cosmosService, ILogger<ExportService> logger)
        {
            _cosmosService = cosmosService ?? throw new ArgumentNullException(nameof(cosmosService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<string> ExportGraphAsJsonAsync(string graphId)
        {
            var graphExport = await ExportGraphAsync(graphId);
            
            var options = new JsonSerializerOptions
            {
                WriteIndented = true,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            return JsonSerializer.Serialize(graphExport, options);
        }

        public async Task<GraphExport> ExportGraphAsync(string graphId)
        {
            _logger.LogInformation("Exporting graph with ID: {Id}", graphId);

            // Get the graph
            var graph = await _cosmosService.GetItemAsync<Graph>(graphId, graphId);
            if (graph == null)
            {
                _logger.LogWarning("Graph with ID: {Id} not found for export", graphId);
                throw new ArgumentException($"Graph with ID: {graphId} not found");
            }

            // Get all nodes associated with this graph
            _logger.LogInformation("Retrieving nodes associated with graph: {Id}", graphId);
            var nodes = await _cosmosService.GetNodes(graphId);
            _logger.LogInformation("Found {Count} nodes to export", nodes.Count);

            // Get all edges associated with this graph
            _logger.LogInformation("Retrieving edges associated with graph: {Id}", graphId);
            var edges = await _cosmosService.GetEdges(graphId);
            _logger.LogInformation("Found {Count} edges to export", edges.Count);

            // Create the export object
            var graphExport = new GraphExport
            {
                Graph = graph,
                Nodes = nodes,
                Edges = edges,
                ExportDate = DateTime.UtcNow,
                Metadata = new GraphExportMetadata
                {
                    NodeCount = nodes.Count,
                    EdgeCount = edges.Count,
                    Version = "1.0"
                }
            };

            return graphExport;
        }
    }

    public class GraphExport
    {
        public Graph Graph { get; set; }
        public List<Node> Nodes { get; set; }
        public List<Edge> Edges { get; set; }
        public DateTime ExportDate { get; set; }
        public GraphExportMetadata Metadata { get; set; }
    }

    public class GraphExportMetadata
    {
        public int NodeCount { get; set; }
        public int EdgeCount { get; set; }
        public string Version { get; set; }
    }
}
