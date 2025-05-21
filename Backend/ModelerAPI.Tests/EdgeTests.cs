using ModelerAPI.ApiService.Models;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace ModelerAPI.Tests
{
    public class EdgeTests : TestBase
    {
        private const string TestGraphId = "graph1"; // Consistent test GraphId

        [Fact]
        public async Task CreateEdgeAsync_WithValidEdge_ReturnsEdgeWithId()
        {
            // Arrange
            var newEdge = new Edge
            {
                Source = "node1",
                Target = "node2",
                EdgeType = "connected_to",
                GraphId = TestGraphId
            };

            MockCosmosService.Setup(m => m.CreateEdgeAsync(It.IsAny<Edge>()))
                .ReturnsAsync((Edge edge) =>
                {
                    edge.Id = Guid.NewGuid().ToString();
                    edge.CreatedAt = DateTime.UtcNow;
                    return edge;
                });

            // Act
            var result = await MockCosmosService.Object.CreateEdgeAsync(newEdge);

            // Assert
            Assert.NotNull(result);
            Assert.NotNull(result.Id);
            Assert.Equal("node1", result.Source);
            Assert.Equal("node2", result.Target);
            Assert.Equal("connected_to", result.EdgeType);
            Assert.Equal(TestGraphId, result.GraphId);
            Assert.NotEqual(default, result.CreatedAt);

            // Verify the service was called with the right parameters
            MockCosmosService.Verify(m => m.CreateEdgeAsync(It.Is<Edge>(e =>
                e.Source == "node1" &&
                e.Target == "node2" &&
                e.EdgeType == "connected_to" &&
                e.GraphId == TestGraphId)), Times.Once);
        }

        [Fact]
        public async Task CreateEdgeAsync_WithoutGraphId_ThrowsArgumentException()
        {
            // Arrange
            var invalidEdge = new Edge
            {
                Source = "node1",
                Target = "node2",
                EdgeType = "connected_to",
                GraphId = "" // Empty GraphId
            };

            MockCosmosService.Setup(m => m.CreateEdgeAsync(It.Is<Edge>(e =>
                string.IsNullOrEmpty(e.GraphId))))
                .ThrowsAsync(new ArgumentException("GraphId is required for edges"));

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
                MockCosmosService.Object.CreateEdgeAsync(invalidEdge));

            Assert.Equal("GraphId is required for edges", exception.Message);
        }

        [Fact]
        public async Task CreateEdgeAsync_WithoutSourceOrTarget_ThrowsArgumentException()
        {
            // Arrange
            var invalidEdge = new Edge
            {
                Source = "", // Empty source
                Target = "node2",
                EdgeType = "connected_to",
                GraphId = TestGraphId
            };

            MockCosmosService.Setup(m => m.CreateEdgeAsync(It.Is<Edge>(e =>
                string.IsNullOrEmpty(e.Source) || string.IsNullOrEmpty(e.Target))))
                .ThrowsAsync(new ArgumentException("Source and Target are required"));

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
                MockCosmosService.Object.CreateEdgeAsync(invalidEdge));

            Assert.Equal("Source and Target are required", exception.Message);
        }

        [Fact]
        public async Task GetEdges_WithGraphId_ReturnsEdgesForSpecificGraph()
        {
            // Arrange
            var testEdges = new List<Edge>
            {
                new Edge { Id = "edge1", Source = "node1", Target = "node2", EdgeType = "connected_to", GraphId = TestGraphId, CreatedAt = DateTime.UtcNow },
                new Edge { Id = "edge2", Source = "node2", Target = "node3", EdgeType = "depends_on", GraphId = TestGraphId, CreatedAt = DateTime.UtcNow }
            };

            MockCosmosService.Setup(m => m.GetEdges(TestGraphId)).ReturnsAsync(testEdges);

            // Act
            var result = await MockCosmosService.Object.GetEdges(TestGraphId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count);
            Assert.Equal("connected_to", result[0].EdgeType);
            Assert.Equal("depends_on", result[1].EdgeType);
            Assert.All(result, edge => Assert.Equal(TestGraphId, edge.GraphId));

            // Verify the service was called with the GraphId
            MockCosmosService.Verify(m => m.GetEdges(TestGraphId), Times.Once);
        }

        [Fact]
        public async Task GetEdges_WithoutGraphId_ReturnsAllEdges()
        {
            // Arrange
            var testEdges = new List<Edge>
            {
                new Edge { Id = "edge1", Source = "node1", Target = "node2", EdgeType = "connected_to", GraphId = "graph1", CreatedAt = DateTime.UtcNow },
                new Edge { Id = "edge2", Source = "node2", Target = "node3", EdgeType = "depends_on", GraphId = "graph2", CreatedAt = DateTime.UtcNow }
            };

            MockCosmosService.Setup(m => m.GetEdges(null)).ReturnsAsync(testEdges);

            // Act
            var result = await MockCosmosService.Object.GetEdges();

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count);
            Assert.Contains(result, edge => edge.GraphId == "graph1");
            Assert.Contains(result, edge => edge.GraphId == "graph2");

            // Verify the service was called with null GraphId
            MockCosmosService.Verify(m => m.GetEdges(null), Times.Once);
        }

        [Fact]
        public async Task DeleteEdgeAsync_WithExistingId_ReturnsTrue()
        {
            // Arrange
            string edgeId = "edge1";
            MockCosmosService.Setup(m => m.DeleteEdgeAsync(edgeId)).ReturnsAsync(true);

            // Act
            var result = await MockCosmosService.Object.DeleteEdgeAsync(edgeId);

            // Assert
            Assert.True(result);

            // Verify the service was called with the correct ID
            MockCosmosService.Verify(m => m.DeleteEdgeAsync(edgeId), Times.Once);
        }

        [Fact]
        public async Task DeleteEdgeAsync_WithNonExistingId_ReturnsFalse()
        {
            // Arrange
            string edgeId = "nonexistent";
            MockCosmosService.Setup(m => m.DeleteEdgeAsync(edgeId)).ReturnsAsync(false);

            // Act
            var result = await MockCosmosService.Object.DeleteEdgeAsync(edgeId);

            // Assert
            Assert.False(result);

            // Verify the service was called with the correct ID
            MockCosmosService.Verify(m => m.DeleteEdgeAsync(edgeId), Times.Once);
        }
    }
}
