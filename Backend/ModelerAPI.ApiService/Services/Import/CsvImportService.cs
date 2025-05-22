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
            // Parse the path column as a JSON array
            var pathJson = record.Path;
            var pathArray = JsonConvert.DeserializeObject<List<string>>(pathJson);

            // Return the top-level path (first element)
            return pathArray?[0] ?? "Unknown";
        }
        catch (Exception ex)
        {
            // Log the error and return a default value
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

                var nodes = new List<Node>();
                var edges = new List<Edge>();

                foreach (var record in group)
                {
                    if (record.Class == "Node")
                    {
                        var node = new Node
                        {
                            Id = Guid.NewGuid().ToString(),
                            Name = record.PropertyName,
                            NodeType = record.PropertyType,
                            GraphId = graphId,
                            CreatedAt = DateTime.UtcNow
                        };
                        nodes.Add(await _cosmosService.CreateNodeAsync(node));
                    }
                    else if (record.Class == "Edge")
                    {
                        var edge = new Edge
                        {
                            Id = Guid.NewGuid().ToString(),
                            Source = record.Source,
                            Target = record.Target,
                            EdgeType = record.PropertyType,
                            GraphId = graphId,
                            CreatedAt = DateTime.UtcNow
                        };
                        edges.Add(await _cosmosService.CreateEdgeAsync(edge));
                    }
                }

                createdGraphIds.Add(graphId);
            }

            return createdGraphIds;
        }
    }
}
