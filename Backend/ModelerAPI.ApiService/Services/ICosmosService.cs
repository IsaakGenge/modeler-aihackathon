using ModelerAPI.ApiService.Models;

namespace ModelerAPI.ApiService.Services
{
    public interface ICosmosService
    {
        Task<Node> CreateNodeAsync(Node node);
        Task<List<Node>> GetNodes();
        Task<Edge> CreateEdgeAsync(Edge edge);
        Task<List<Edge>> GetEdges();
        Task<bool> DeleteNodeAsync(string id);
        Task<bool> DeleteEdgeAsync(string id);
    }
}

