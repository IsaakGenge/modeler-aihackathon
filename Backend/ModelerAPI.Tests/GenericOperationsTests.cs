using ModelerAPI.ApiService.Models;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace ModelerAPI.Tests
{
    public class GenericOperationsTests : TestBase
    {
        [Fact]
        public async Task GetItemAsync_WithValidParameters_ReturnsItem()
        {
            // Arrange
            var testNode = new Node
            {
                Id = "node1",
                Name = "Test Node",
                NodeType = "person",
                GraphId = "graph1",
                CreatedAt = DateTime.UtcNow
            };

            MockCosmosService.Setup(m => m.GetItemAsync<Node>("node1", "graph1"))
                .ReturnsAsync(testNode);

            // Act
            var result = await MockCosmosService.Object.GetItemAsync<Node>("node1", "graph1");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("node1", result.Id);
            Assert.Equal("Test Node", result.Name);

            // Verify service call
            MockCosmosService.Verify(m => m.GetItemAsync<Node>("node1", "graph1"), Times.Once);
        }

        [Fact]
        public async Task GetItemAsync_WithNonExistingId_ReturnsNull()
        {
            // Arrange
            MockCosmosService.Setup(m => m.GetItemAsync<Node>("nonexistent", "graph1"))
                .ReturnsAsync((Node)null);

            // Act
            var result = await MockCosmosService.Object.GetItemAsync<Node>("nonexistent", "graph1");

            // Assert
            Assert.Null(result);

            // Verify service call
            MockCosmosService.Verify(m => m.GetItemAsync<Node>("nonexistent", "graph1"), Times.Once);
        }

        [Fact]
        public async Task CreateItemAsync_WithValidItem_ReturnsCreatedItem()
        {
            // Arrange
            var graph = new Graph
            {
                Name = "Test Graph",
                DocumentType = "Graph"
            };

            MockCosmosService.Setup(m => m.CreateItemAsync(It.IsAny<Graph>(), It.IsAny<string>()))
                .ReturnsAsync((Graph g, string _) =>
                {
                    g.Id = Guid.NewGuid().ToString();
                    g.CreatedAt = DateTime.UtcNow;
                    g.UpdatedAt = DateTime.UtcNow;
                    return g;
                });

            // Act
            var result = await MockCosmosService.Object.CreateItemAsync(graph, graph.Id);

            // Assert
            Assert.NotNull(result);
            Assert.NotNull(result.Id);
            Assert.Equal("Test Graph", result.Name);
            Assert.Equal("Graph", result.DocumentType);
            Assert.NotEqual(default, result.CreatedAt);
            Assert.NotEqual(default, result.UpdatedAt);

            // Verify service call
            MockCosmosService.Verify(m => m.CreateItemAsync(
                It.Is<Graph>(g => g.Name == "Test Graph" && g.DocumentType == "Graph"),
                It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task UpsertItemAsync_WithExistingItem_ReturnsUpdatedItem()
        {
            // Arrange
            var graph = new Graph
            {
                Id = "graph1",
                Name = "Updated Graph",
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                DocumentType = "Graph"
            };

            MockCosmosService.Setup(m => m.UpsertItemAsync(It.IsAny<Graph>(), It.IsAny<string>()))
                .ReturnsAsync((Graph g, string _) =>
                {
                    g.UpdatedAt = DateTime.UtcNow;
                    return g;
                });

            // Act
            var result = await MockCosmosService.Object.UpsertItemAsync(graph, graph.Id);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("graph1", result.Id);
            Assert.Equal("Updated Graph", result.Name);
            Assert.NotEqual(default, result.UpdatedAt);

            // Verify service call
            MockCosmosService.Verify(m => m.UpsertItemAsync(
                It.Is<Graph>(g => g.Id == "graph1" && g.Name == "Updated Graph"),
                "graph1"), Times.Once);
        }

        [Fact]
        public async Task DeleteItemAsync_WithValidParameters_ReturnsTrue()
        {
            // Arrange
            string id = "item1";
            string partitionKey = "partition1";

            MockCosmosService.Setup(m => m.DeleteItemAsync(id, partitionKey))
                .ReturnsAsync(true);

            // Act
            var result = await MockCosmosService.Object.DeleteItemAsync(id, partitionKey);

            // Assert
            Assert.True(result);

            // Verify service call
            MockCosmosService.Verify(m => m.DeleteItemAsync(id, partitionKey), Times.Once);
        }

        [Fact]
        public async Task DeleteItemAsync_WithNonExistingId_ReturnsFalse()
        {
            // Arrange
            string id = "nonexistent";
            string partitionKey = "partition1";

            MockCosmosService.Setup(m => m.DeleteItemAsync(id, partitionKey))
                .ReturnsAsync(false);

            // Act
            var result = await MockCosmosService.Object.DeleteItemAsync(id, partitionKey);

            // Assert
            Assert.False(result);

            // Verify service call
            MockCosmosService.Verify(m => m.DeleteItemAsync(id, partitionKey), Times.Once);
        }

        [Fact]
        public async Task QueryItemsAsync_WithValidQuery_ReturnsItems()
        {
            // Arrange
            string query = "SELECT * FROM c WHERE c.documentType = 'Node'";
            var testNodes = new List<Node>
            {
                new Node { Id = "node1", Name = "Node 1", NodeType = "person" },
                new Node { Id = "node2", Name = "Node 2", NodeType = "location" }
            };

            MockCosmosService.Setup(m => m.QueryItemsAsync<Node>(query))
                .ReturnsAsync(testNodes);

            // Act
            var result = await MockCosmosService.Object.QueryItemsAsync<Node>(query);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count());
            Assert.Contains(result, n => n.Id == "node1");
            Assert.Contains(result, n => n.Id == "node2");

            // Verify service call
            MockCosmosService.Verify(m => m.QueryItemsAsync<Node>(query), Times.Once);
        }

        [Fact]
        public async Task QueryItemsAsync_WithInvalidQuery_ThrowsException()
        {
            // Arrange
            string invalidQuery = "INVALID QUERY";

            MockCosmosService.Setup(m => m.QueryItemsAsync<Node>(invalidQuery))
                .ThrowsAsync(new ArgumentException("Invalid query syntax"));

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() => 
                MockCosmosService.Object.QueryItemsAsync<Node>(invalidQuery));
            
            Assert.Equal("Invalid query syntax", exception.Message);

            // Verify service call
            MockCosmosService.Verify(m => m.QueryItemsAsync<Node>(invalidQuery), Times.Once);
        }
    }
}
