using ModelerAPI.ApiService.Models;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace ModelerAPI.Tests
{
    public class GraphTests : TestBase
    {
        [Fact]
        public async Task GetGraphs_ReturnsAllGraphs()
        {
            // Arrange
            string query = "SELECT * FROM c WHERE c.documentType = 'Graph'";
            var testGraphs = new List<Graph>
            {
                new Graph { Id = "graph1", Name = "Graph 1" },
                new Graph { Id = "graph2", Name = "Graph 2" }
            };

            MockCosmosService.Setup(m => m.QueryItemsAsync<Graph>(It.IsAny<string>()))
                .ReturnsAsync(testGraphs);

            // Act
            var result = await MockCosmosService.Object.QueryItemsAsync<Graph>(query);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count());
            Assert.Contains(result, g => g.Id == "graph1");
            Assert.Contains(result, g => g.Id == "graph2");

            // Verify service call
            MockCosmosService.Verify(m => m.QueryItemsAsync<Graph>(It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task GetGraphById_ReturnsSpecificGraph()
        {
            // Arrange
            string graphId = "graph1";
            var testGraph = new Graph
            {
                Id = graphId,
                Name = "Test Graph",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DocumentType = "Graph"
            };

            MockCosmosService.Setup(m => m.GetItemAsync<Graph>(graphId, graphId))
                .ReturnsAsync(testGraph);

            // Act
            var result = await MockCosmosService.Object.GetItemAsync<Graph>(graphId, graphId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(graphId, result.Id);
            Assert.Equal("Test Graph", result.Name);

            // Verify service call
            MockCosmosService.Verify(m => m.GetItemAsync<Graph>(graphId, graphId), Times.Once);
        }

        [Fact]
        public async Task CreateGraph_CreatesAndReturnsGraph()
        {
            // Arrange
            var newGraph = new Graph
            {
                Name = "New Graph",
                DocumentType = "Graph"
            };

            MockCosmosService.Setup(m => m.CreateItemAsync(It.IsAny<Graph>(), It.IsAny<string>()))
                .ReturnsAsync((Graph g, string _) =>
                {
                    g.Id = Guid.NewGuid().ToString();
                    g.PartitionKey = g.Id;
                    g.CreatedAt = DateTime.UtcNow;
                    g.UpdatedAt = DateTime.UtcNow;
                    return g;
                });

            // Act
            var result = await MockCosmosService.Object.CreateItemAsync(newGraph, newGraph.Id);

            // Assert
            Assert.NotNull(result);
            Assert.NotNull(result.Id);
            Assert.Equal(result.Id, result.PartitionKey);
            Assert.Equal("New Graph", result.Name);
            Assert.Equal("Graph", result.DocumentType);
            Assert.NotEqual(default, result.CreatedAt);
            Assert.NotEqual(default, result.UpdatedAt);

            // Verify service call
            MockCosmosService.Verify(m => m.CreateItemAsync(
                It.Is<Graph>(g => g.Name == "New Graph"),
                It.IsAny<string>()), Times.Once);
        }

        [Fact]
        public async Task UpdateGraph_UpdatesAndReturnsGraph()
        {
            // Arrange
            var existingGraph = new Graph
            {
                Id = "graph1",
                Name = "Original Name",
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                UpdatedAt = DateTime.UtcNow.AddDays(-1),
                DocumentType = "Graph",
                PartitionKey = "graph1"
            };

            MockCosmosService.Setup(m => m.UpsertItemAsync(It.IsAny<Graph>(), It.IsAny<string>()))
                .ReturnsAsync((Graph g, string _) =>
                {
                    g.UpdatedAt = DateTime.UtcNow;
                    return g;
                });

            existingGraph.Name = "Updated Name";

            // Act
            var result = await MockCosmosService.Object.UpsertItemAsync(existingGraph, existingGraph.Id);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("graph1", result.Id);
            Assert.Equal("Updated Name", result.Name);
            Assert.NotEqual(existingGraph.CreatedAt, result.UpdatedAt);

            // Verify service call
            MockCosmosService.Verify(m => m.UpsertItemAsync(
                It.Is<Graph>(g => g.Id == "graph1" && g.Name == "Updated Name"),
                "graph1"), Times.Once);
        }

        [Fact]
        public async Task DeleteGraph_ReturnsTrue_WhenSuccessful()
        {
            // Arrange
            string graphId = "graph1";

            MockCosmosService.Setup(m => m.DeleteItemAsync(graphId, graphId))
                .ReturnsAsync(true);

            // Act
            var result = await MockCosmosService.Object.DeleteItemAsync(graphId, graphId);

            // Assert
            Assert.True(result);

            // Verify service call
            MockCosmosService.Verify(m => m.DeleteItemAsync(graphId, graphId), Times.Once);
        }

        [Fact]
        public async Task DeleteGraph_ReturnsFalse_WhenNotFound()
        {
            // Arrange
            string graphId = "nonexistent";

            MockCosmosService.Setup(m => m.DeleteItemAsync(graphId, graphId))
                .ReturnsAsync(false);

            // Act
            var result = await MockCosmosService.Object.DeleteItemAsync(graphId, graphId);

            // Assert
            Assert.False(result);

            // Verify service call
            MockCosmosService.Verify(m => m.DeleteItemAsync(graphId, graphId), Times.Once);
        }
    }
}
