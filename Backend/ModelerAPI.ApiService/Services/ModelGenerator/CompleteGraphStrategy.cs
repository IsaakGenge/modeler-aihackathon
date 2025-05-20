using ModelerAPI.ApiService.Models;

namespace ModelerAPI.ApiService.Services.ModelGenerator
{
    /// <summary>
    /// Complete graph generation strategy that connects every node to every other node
    /// </summary>
    public class CompleteGraphStrategy : IGraphGenerationStrategy
    {
        private readonly ICosmosService _cosmosService;

        public CompleteGraphStrategy(ICosmosService cosmosService)
        {
            _cosmosService = cosmosService ?? throw new ArgumentNullException(nameof(cosmosService));
        }

        public async Task<(string GraphId, List<Node> Nodes, List<Edge> Edges)> GenerateGraphAsync(int nodeCount, string graphName)
        {
            if (nodeCount < 2)
                throw new ArgumentException("Complete graph requires at least 2 nodes", nameof(nodeCount));

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
                    NodeType = "complete",
                    GraphId = graphId,
                    CreatedAt = DateTime.UtcNow
                };

                var createdNode = await _cosmosService.CreateNodeAsync(node);
                nodes.Add(createdNode);
            }

            // Create edges (connect each node to every other node)
            var edges = new List<Edge>();
            for (int i = 0; i < nodes.Count; i++)
            {
                for (int j = i + 1; j < nodes.Count; j++)
                {
                    var edge = new Edge
                    {
                        Source = nodes[i].Id,
                        Target = nodes[j].Id,
                        EdgeType = "connected_to",
                        GraphId = graphId,
                        CreatedAt = DateTime.UtcNow
                    };

                    var createdEdge = await _cosmosService.CreateEdgeAsync(edge);
                    edges.Add(createdEdge);
                }
            }

            return (graphId, nodes, edges);
        }
    }

}
