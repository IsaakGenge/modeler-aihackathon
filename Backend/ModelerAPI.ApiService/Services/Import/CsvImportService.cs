using CsvHelper;
using CsvHelper.Configuration;
using ModelerAPI.ApiService.Models;
using Newtonsoft.Json;

using System.Globalization;
using System.Text;

namespace ModelerAPI.ApiService.Services.Import
{
    public interface ICsvImportService
    {
        Task<List<string>> ImportGraphFromCsvAsync(Stream csvStream, string newGraphName);
    }

    public class CsvImportService : ICsvImportService
    {
        private readonly ICosmosService _cosmosService;

        public CsvImportService(ICosmosService cosmosService)
        {
            _cosmosService = cosmosService ?? throw new ArgumentNullException(nameof(cosmosService));
        }

        public async Task<List<string>> ImportGraphFromCsvAsync(Stream csvStream, string newGraphName)
        {
            using var reader = new StreamReader(csvStream, Encoding.UTF8);
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture));

            // Parse the CSV into a list of records
            var records = csv.GetRecords<dynamic>().ToList();

            // Parse and group records by the top-level path
            var groupedByPath = records
                .GroupBy(record =>
                {
                    try
                    {
                        // Extract the path column
                        var pathJson = record.Path;

                        // Parse the path column as a JSON array
                        var pathArray = JsonConvert.DeserializeObject<List<string>>(pathJson);

                        // Return the top-level path (first element)
                        return pathArray?[0] ?? "Unknown";
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error parsing path: {ex.Message}. Path value: {record.Path}");
                        return "Unknown";
                    }
                });

            var createdGraphIds = new List<string>();

            foreach (var group in groupedByPath)
            {
                // Create a new graph for each unique top-level path
                var graphId = Guid.NewGuid().ToString();
                var graph = new Graph
                {
                    Id = graphId,
                    Name = $"{newGraphName} - {group.Key}",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    DocumentType = "Graph",
                    PartitionKey = graphId
                };

                await _cosmosService.CreateItemAsync(graph, graphId);

                var nodes = new Dictionary<string, Node>();
                var edges = new List<Edge>();
                var batchNodes = new List<Node>();
                var batchEdges = new List<Edge>();

                foreach (var record in group)
                {
                    try
                    {
                        // Parse the path column
                        var pathJson = record.Path;
                        var pathArray = JsonConvert.DeserializeObject<List<string>>(pathJson);

                        if (pathArray == null || pathArray.Count == 0)
                            continue;

                        // Traverse the path array to create nodes and edges
                        string? parentId = null;
                        foreach (var segment in pathArray)
                        {
                            if (!nodes.ContainsKey(segment))
                            {
                                // Create a new node for the segment
                                var node = new Node
                                {
                                    Id = Guid.NewGuid().ToString(),
                                    Name = segment,
                                    NodeType = "TreeNode",
                                    GraphId = graphId,
                                    CreatedAt = DateTime.UtcNow
                                };

                                nodes[segment] = node;
                                batchNodes.Add(node);
                            }

                            if (parentId != null)
                            {
                                // Create an edge between the parent and the current node
                                var edge = new Edge
                                {
                                    Id = Guid.NewGuid().ToString(),
                                    Source = parentId,
                                    Target = nodes[segment].Id,
                                    EdgeType = "ParentChild",
                                    GraphId = graphId,
                                    CreatedAt = DateTime.UtcNow
                                };

                                batchEdges.Add(edge);
                            }

                            // Update the parent ID for the next iteration
                            parentId = nodes[segment].Id;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error processing record: {ex.Message}");
                    }
                }

                // Batch create nodes and edges
                await _cosmosService.BatchCreateNodesAsync(batchNodes);
                await _cosmosService.BatchCreateEdgesAsync(batchEdges);

                createdGraphIds.Add(graphId);
            }

            return createdGraphIds;
        }
    }
}
