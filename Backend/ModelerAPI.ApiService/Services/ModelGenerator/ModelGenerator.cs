using ModelerAPI.ApiService.Models;

namespace ModelerAPI.ApiService.Services.ModelGenerator
{
    /// <summary>
    /// Interface for graph generation strategies
    /// </summary>


 
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
                { "complete", new CompleteGraphStrategy(_cosmosService) },
                { "plant", new PlantGraphStrategy(_cosmosService) },
                { "tree", new TreeGraphStrategy(_cosmosService) }
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
