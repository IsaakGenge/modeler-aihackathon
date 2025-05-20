using ModelerAPI.ApiService.Models;

public interface ICosmosService
{
    // Existing methods
    Task<Node> CreateNodeAsync(Node node);
    Task<List<Node>> GetNodes();
    Task<Edge> CreateEdgeAsync(Edge edge);
    Task<List<Edge>> GetEdges();
    Task<bool> DeleteNodeAsync(string id);
    Task<bool> DeleteEdgeAsync(string id);

    // New generic CRUD methods for Cosmos DB operations
    Task<T> GetItemAsync<T>(string databaseName, string containerName, string id, string partitionKey);
    Task<T> CreateItemAsync<T>(string databaseName, string containerName, T item, string partitionKey);
    Task<T> UpsertItemAsync<T>(string databaseName, string containerName, T item, string partitionKey);
    Task<bool> DeleteItemAsync(string databaseName, string containerName, string id, string partitionKey);
    Task<IEnumerable<T>> QueryItemsAsync<T>(string databaseName, string containerName, string queryString);
}
