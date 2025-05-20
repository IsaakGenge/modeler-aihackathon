using ModelerAPI.ApiService.Models;

namespace ModelerAPI.ApiService.Services.ModelGenerator
{
    public class StarGraphStrategy : IGraphGenerationStrategy
    {
        private readonly ICosmosService _cosmosService;

        public StarGraphStrategy(ICosmosService cosmosService)
        {
            _cosmosService = cosmosService ?? throw new ArgumentNullException(nameof(cosmosService));
        }

        public async Task<(string GraphId, List<Node> Nodes, List<Edge> Edges)> GenerateGraphAsync(int nodeCount, string graphName)
        {
            if (nodeCount < 2)
                throw new ArgumentException("Star graph requires at least 2 nodes", nameof(nodeCount));

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

            // Create center node
            var centerNode = new Node
            {
                Name = "Central Node",
                NodeType = "hub",
                GraphId = graphId,
                CreatedAt = DateTime.UtcNow
            };

            var createdCenterNode = await _cosmosService.CreateNodeAsync(centerNode);
            nodes.Add(createdCenterNode);

            // Create satellite nodes
            for (int i = 1; i < nodeCount; i++)
            {
                var node = new Node
                {
                    Name = $"Satellite Node {i}",
                    NodeType = "satellite",
                    GraphId = graphId,
                    CreatedAt = DateTime.UtcNow
                };

                var createdNode = await _cosmosService.CreateNodeAsync(node);
                nodes.Add(createdNode);
            }

            // Create edges (connect all to center)
            var edges = new List<Edge>();
            for (int i = 1; i < nodes.Count; i++)
            {
                var edge = new Edge
                {
                    Source = createdCenterNode.Id,
                    Target = nodes[i].Id,
                    EdgeType = "connected_to",
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
