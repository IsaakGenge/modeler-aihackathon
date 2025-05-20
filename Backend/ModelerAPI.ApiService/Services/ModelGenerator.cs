using ModelerAPI.ApiService.Models;

namespace ModelerAPI.ApiService.Services
{
    /// <summary>
    /// Interface for graph generation strategies
    /// </summary>
    public interface IGraphGenerationStrategy
    {
        /// <summary>
        /// Generates a graph with the specified number of nodes
        /// </summary>
        /// <param name="nodeCount">Number of nodes to generate</param>
        /// <param name="graphName">Name for the generated graph</param>
        /// <returns>Generated graph information</returns>
        Task<(string GraphId, List<Node> Nodes, List<Edge> Edges)> GenerateGraphAsync(int nodeCount, string graphName);
    }

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
            string[] nodeTypes = { "person", "location", "organization", "event", "concept" };
            return nodeTypes[_random.Next(nodeTypes.Length)];
        }

        private string GetRandomEdgeType()
        {
            string[] edgeTypes = { "connected_to", "depends_on", "related_to", "part_of", "follows" };
            return edgeTypes[_random.Next(edgeTypes.Length)];
        }
    }

    /// <summary>
    /// Star graph generation strategy that connects all nodes to a central node
    /// </summary>
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

    /// <summary>
    /// Model generator service for creating various graph structures
    /// </summary>
    public class ModelGenerator
    {
        private readonly ICosmosService _cosmosService;
        private readonly Dictionary<string, IGraphGenerationStrategy> _strategies;
        private readonly ILogger<ModelGenerator> _logger;

        public ModelGenerator(ICosmosService cosmosService, ILogger<ModelGenerator> logger)
        {
            _cosmosService = cosmosService ?? throw new ArgumentNullException(nameof(cosmosService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            // Register strategies
            _strategies = new Dictionary<string, IGraphGenerationStrategy>
            {
                { "random", new RandomGraphStrategy(_cosmosService) },
                { "star", new StarGraphStrategy(_cosmosService) },
                { "chain", new ChainGraphStrategy(_cosmosService) },
                { "complete", new CompleteGraphStrategy(_cosmosService) }
            };
        }

        /// <summary>
        /// Generate a new graph based on the specified strategy
        /// </summary>
        /// <param name="strategyName">Name of the generation strategy to use</param>
        /// <param name="nodeCount">Number of nodes to generate</param>
        /// <param name="graphName">Name for the graph</param>
        /// <returns>Generated graph information</returns>
        public async Task<(string GraphId, int NodeCount, int EdgeCount)> GenerateGraphAsync(string strategyName, int nodeCount, string graphName)
        {
            _logger.LogInformation("Generating graph with strategy: {Strategy}, Nodes: {NodeCount}, Name: {Name}",
                strategyName, nodeCount, graphName);

            if (string.IsNullOrWhiteSpace(graphName))
            {
                graphName = $"Generated Graph - {strategyName} - {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}";
            }

            if (nodeCount < 1)
            {
                throw new ArgumentException("Node count must be at least 1", nameof(nodeCount));
            }

            // Default to random if strategy not found
            if (!_strategies.TryGetValue(strategyName.ToLower(), out var strategy))
            {
                _logger.LogWarning("Strategy '{Strategy}' not found, using 'random' instead", strategyName);
                strategy = _strategies["random"];
            }

            try
            {
                var result = await strategy.GenerateGraphAsync(nodeCount, graphName);

                _logger.LogInformation("Successfully generated graph. ID: {GraphId}, Nodes: {NodeCount}, Edges: {EdgeCount}",
                    result.GraphId, result.Nodes.Count, result.Edges.Count);

                return (result.GraphId, result.Nodes.Count, result.Edges.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating graph with strategy {Strategy}", strategyName);
                throw;
            }
        }

        /// <summary>
        /// Get all available graph generation strategies
        /// </summary>
        /// <returns>List of available strategy names</returns>
        public IEnumerable<string> GetAvailableStrategies()
        {
            return _strategies.Keys;
        }
    }
}
