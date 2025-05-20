using ModelerAPI.ApiService.Models;

namespace ModelerAPI.ApiService.Services.ModelGenerator
{
    /// <summary>
    /// Chain graph generation strategy that creates a linear sequence of nodes
    /// </summary>
    public class ChainGraphStrategy : IGraphGenerationStrategy
    {
        private readonly ICosmosService _cosmosService;

        public ChainGraphStrategy(ICosmosService cosmosService)
        {
            _cosmosService = cosmosService ?? throw new ArgumentNullException(nameof(cosmosService));
        }

        public async Task<(string GraphId, List<Node> Nodes, List<Edge> Edges)> GenerateGraphAsync(int nodeCount, string graphName)
        {
            if (nodeCount < 2)
                throw new ArgumentException("Chain graph requires at least 2 nodes", nameof(nodeCount));

            // Create a new graph
            var graphId = Guid.NewGuid().ToString();
            var graph = new Graph
            {
                Id = graphId,
                Name = graphName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DocumentType = "Graph",
                PartitionKey = graphId // Set partition key to match ID
            };

            await _cosmosService.CreateItemAsync(graph, graphId);

            // Create nodes
            var nodes = new List<Node>();

            for (int i = 0; i < nodeCount; i++)
            {
                var node = new Node
                {
                    Name = $"Node {i + 1}",
                    NodeType = "chain",
                    GraphId = graphId,
                    CreatedAt = DateTime.UtcNow
                };

                var createdNode = await _cosmosService.CreateNodeAsync(node);
                nodes.Add(createdNode);
            }

            // Create edges (connect in sequence)
            var edges = new List<Edge>();
            for (int i = 0; i < nodes.Count - 1; i++)
            {
                var edge = new Edge
                {
                    Source = nodes[i].Id,
                    Target = nodes[i + 1].Id,
                    EdgeType = "next",
                    GraphId = graphId,
                    CreatedAt = DateTime.UtcNow
                };

                var createdEdge = await _cosmosService.CreateEdgeAsync(edge);
                edges.Add(createdEdge);
            }

            return (graphId, nodes, edges);
        }
    }

}
