using ModelerAPI.ApiService.Models;

namespace ModelerAPI.ApiService.Services.ModelGenerator
{
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

}
