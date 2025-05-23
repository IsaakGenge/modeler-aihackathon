﻿using ModelerAPI.ApiService.Models;

public interface ICosmosService
{
    // Node operations
    Task<Node> CreateNodeAsync(Node node);
    Task<List<Node>> GetNodes(string graphId = null);
    Task<bool> DeleteNodeAsync(string id);
    Task<Node> UpdateNodeAsync(Node node);

    // Edge operations
    Task<Edge> CreateEdgeAsync(Edge edge);
    Task<List<Edge>> GetEdges(string graphId = null);
    Task<bool> DeleteEdgeAsync(string id);
    Task<Edge> UpdateEdgeAsync(Edge edge);




    // Generic Cosmos DB operations
    Task<T> GetItemAsync<T>(string id, string partitionKey);
    Task<T> CreateItemAsync<T>(T item, string partitionKey);
    Task<T> UpsertItemAsync<T>(T item, string partitionKey);
    Task<bool> DeleteItemAsync(string id, string partitionKey);
    Task<IEnumerable<T>> QueryItemsAsync<T>(string queryString);
    Task<bool> UpdateNodePositionsAsync(string nodeId, double x, double y);
    Task<bool> BatchUpdateNodePositionsAsync(Dictionary<string, (double x, double y)> nodePositions);
    Task<bool> UpdateNodePropertiesAsync(string nodeId, Dictionary<string, object> properties);
    Task<bool> UpdateEdgePropertiesAsync(string edgeId, Dictionary<string, object> properties);
    Task<List<Edge>> BatchCreateEdgesAsync(List<Edge> edges);
    Task<bool> BatchDeleteNodesAsync(List<string> nodeIds);
    Task<bool> BatchDeleteEdgesAsync(List<string> edgeIds);
    Task<List<Node>> BatchCreateNodesAsync(List<Node> nodes);
}
