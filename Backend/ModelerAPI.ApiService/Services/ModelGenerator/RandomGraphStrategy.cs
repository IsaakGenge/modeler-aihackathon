using ModelerAPI.ApiService.Models;

namespace ModelerAPI.ApiService.Services.ModelGenerator
{

    /// <summary>
    /// Random graph generation strategy that creates random connections between nodes
    /// </summary>
    public class RandomGraphStrategy : IGraphGenerationStrategy
    {
        private readonly ICosmosService _cosmosService;
        private readonly Random _random = new Random();

        public RandomGraphStrategy(ICosmosService cosmosService)
        {
            _cosmosService = cosmosService ?? throw new ArgumentNullException(nameof(cosmosService));
        }

        public async Task<(string GraphId, List<Node> Nodes, List<Edge> Edges)> GenerateGraphAsync(int nodeCount, string graphName)
        {
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
                    NodeType = GetRandomNodeType(),
                    GraphId = graphId,
                    CreatedAt = DateTime.UtcNow
                };

                var createdNode = await _cosmosService.CreateNodeAsync(node);
                nodes.Add(createdNode);
            }

            // Create edges (random connections)
            var edges = new List<Edge>();
            int edgeCount = _random.Next(nodeCount, nodeCount * 2); // Between n and 2n edges

            for (int i = 0; i < edgeCount; i++)
            {
                int sourceIndex = _random.Next(nodes.Count);
                int targetIndex = _random.Next(nodes.Count);

                // Avoid self-loops
                if (sourceIndex == targetIndex)
                {
                    targetIndex = (targetIndex + 1) % nodes.Count;
                }

                var edge = new Edge
                {
                    Source = nodes[sourceIndex].Id,
                    Target = nodes[targetIndex].Id,
                    EdgeType = GetRandomEdgeType(),
                    GraphId = graphId,
                    CreatedAt = DateTime.UtcNow
                };

                var createdEdge = await _cosmosService.CreateEdgeAsync(edge);
                edges.Add(createdEdge);
            }

            return (graphId, nodes, edges);
        }

        private string GetRandomNodeType()
        {
            string[] nodeTypes = { "Person", "Place", "Thing", "concConceptept" };
            return nodeTypes[_random.Next(nodeTypes.Length)];
        }

        private string GetRandomEdgeType()
        {
            string[] edgeTypes = { "Related", "Belongs", "Contains", "Depends", };
            return edgeTypes[_random.Next(edgeTypes.Length)];
        }
    }

}
