using ModelerAPI.ApiService.Models;
using Moq;

namespace ModelerAPI.Tests
{
    public class EdgeTests : TestBase
    {
        [Fact]
        public async Task GetEdges_ReturnsAllEdges()
        {
            // Arrange
            var testEdges = new List<Edge>
            {
                new Edge { Id = "edge1", Source = "node1", Target = "node2", EdgeType = "connected_to", CreatedAt = DateTime.UtcNow },
                new Edge { Id = "edge2", Source = "node2", Target = "node3", EdgeType = "depends_on", CreatedAt = DateTime.UtcNow }
            };

            MockCosmosService.Setup(m => m.GetEdges()).ReturnsAsync(testEdges);

            // Act
            var result = await MockCosmosService.Object.GetEdges();

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count());
            Assert.Equal("connected_to", result[0].EdgeType);
            Assert.Equal("depends_on", result[1].EdgeType);

            // Verify the service was called
            MockCosmosService.Verify(m => m.GetEdges(), Times.Once);
        }

        [Fact]
        public async Task CreateEdgeAsync_CreatesAndReturnsEdge()
        {
            // Arrange
            var newEdge = new Edge
            {
                Source = "node1",
                Target = "node2",
                EdgeType = "related_to"
            };

            // Mock setup is in the base class

            // Act
            var result = await MockCosmosService.Object.CreateEdgeAsync(newEdge);

            // Assert
            Assert.NotNull(result);
            Assert.NotNull(result.Id); // ID should be assigned
            Assert.Equal("node1", result.Source);
            Assert.Equal("node2", result.Target);
            Assert.Equal("related_to", result.EdgeType);

            // Verify the service was called with the right parameters
            MockCosmosService.Verify(m => m.CreateEdgeAsync(It.Is<Edge>(e =>
                e.Source == "node1" && e.Target == "node2" && e.EdgeType == "related_to")), Times.Once);
        }

        [Fact]
        public async Task DeleteEdgeAsync_ReturnsTrue_WhenSuccessful()
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
        public async Task DeleteEdgeAsync_ReturnsFalse_WhenEdgeNotFound()
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

        [Fact]
        public async Task CreateEdgeAsync_ValidatesSourceAndTarget()
        {
            // Arrange
            var invalidEdge = new Edge
            {
                Source = "", // Empty source
                Target = "node2",
                EdgeType = "related_to"
            };

            MockCosmosService.Setup(m => m.CreateEdgeAsync(It.Is<Edge>(e =>
                string.IsNullOrEmpty(e.Source) || string.IsNullOrEmpty(e.Target))))
                .ThrowsAsync(new ArgumentException("Source and Target are required"));

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() =>
                MockCosmosService.Object.CreateEdgeAsync(invalidEdge));
        }
    }
}
