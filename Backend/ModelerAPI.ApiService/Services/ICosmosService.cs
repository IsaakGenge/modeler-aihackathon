using ModelerAPI.ApiService.Models;

public interface ICosmosService
{
    // Node operations
    Task<Node> CreateNodeAsync(Node node);
    Task<List<Node>> GetNodes(string graphId);
    Task<bool> DeleteNodeAsync(string id);

    // Edge operations
    Task<Edge> CreateEdgeAsync(Edge edge);
    Task<List<Edge>> GetEdges(string graphId);
    Task<bool> DeleteEdgeAsync(string id);

    // Generic Cosmos DB operations
    Task<T> GetItemAsync<T>(string databaseName, string containerName, string id, string partitionKey);
    Task<T> CreateItemAsync<T>(string databaseName, string containerName, T item, string partitionKey);
    Task<T> UpsertItemAsync<T>(string databaseName, string containerName, T item, string partitionKey);
    Task<bool> DeleteItemAsync(string databaseName, string containerName, string id, string partitionKey);
    Task<IEnumerable<T>> QueryItemsAsync<T>(string databaseName, string containerName, string queryString);
}