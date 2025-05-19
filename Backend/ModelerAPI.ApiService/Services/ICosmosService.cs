using ModelerAPI.ApiService.Models;

namespace ModelerAPI.ApiService.Services
{
    public interface ICosmosService
    {
        Task<Node> CreateNodeAsync(Node node);
    }
}