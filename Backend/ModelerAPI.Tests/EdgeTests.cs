using ModelerAPI.ApiService.Models;
using Moq;

namespace ModelerAPI.Tests
{
    public class EdgeTests : TestBase
    {
        private const string TestGraphId = "graph1"; // Consistent test GraphId

        [Fact]
        public async Task GetEdges_ReturnsAllEdges()
        {
            // Arrange
            var testEdges = new List<Edge>
            {
                new Edge { Id = "edge1", Source = "node1", Target = "node2", EdgeType = "connected_to", GraphId = TestGraphId, CreatedAt = DateTime.UtcNow },
                new Edge { Id = "edge2", Source = "node2", Target = "node3", EdgeType = "depends_on", GraphId = TestGraphId, CreatedAt = DateTime.UtcNow }
            };

            // Updated to include GraphId parameter
            MockCosmosService.Setup(m => m.GetEdges(TestGraphId)).ReturnsAsync(testEdges);

            // Act
            var result = await MockCosmosService.Object.GetEdges(TestGraphId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count());
            Assert.Equal("connected_to", result[0].EdgeType);
            Assert.Equal("depends_on", result[1].EdgeType);
            Assert.Equal(TestGraphId, result[0].GraphId);
            Assert.Equal(TestGraphId, result[1].GraphId);

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

            // Setup for null or empty GraphId parameter
            MockCosmosService.Setup(m => m.GetEdges(It.Is<string>(s => string.IsNullOrEmpty(s)))).ReturnsAsync(testEdges);

            // Act
            var result = await MockCosmosService.Object.GetEdges(null);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count());

            // Verify the service was called with null GraphId
            MockCosmosService.Verify(m => m.GetEdges(It.Is<string>(s => string.IsNullOrEmpty(s))), Times.Once);
        }

        [Fact]
        public async Task CreateEdgeAsync_CreatesAndReturnsEdge()
        {
            // Arrange
            var newEdge = new Edge
            {
                Source = "node1",
                Target = "node2",
                EdgeType = "related_to",
                GraphId = TestGraphId // Added required GraphId
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
            Assert.Equal(TestGraphId, result.GraphId); // Verify GraphId was maintained

            // Verify the service was called with the right parameters
            MockCosmosService.Verify(m => m.CreateEdgeAsync(It.Is<Edge>(e =>
                e.Source == "node1" &&
                e.Target == "node2" &&
                e.EdgeType == "related_to" &&
                e.GraphId == TestGraphId)), Times.Once);
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
                EdgeType = "related_to",
                GraphId = TestGraphId // Added required GraphId
            };

            MockCosmosService.Setup(m => m.CreateEdgeAsync(It.Is<Edge>(e =>
                string.IsNullOrEmpty(e.Source) || string.IsNullOrEmpty(e.Target))))
                .ThrowsAsync(new ArgumentException("Source and Target are required"));

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() =>
                MockCosmosService.Object.CreateEdgeAsync(invalidEdge));
        }

        [Fact]
        public async Task CreateEdgeAsync_ValidatesGraphId()
        {
            // Arrange
            var invalidEdge = new Edge
            {
                Source = "node1",
                Target = "node2",
                EdgeType = "related_to",
                GraphId = "" // Empty GraphId
            };

            MockCosmosService.Setup(m => m.CreateEdgeAsync(It.Is<Edge>(e =>
                string.IsNullOrEmpty(e.GraphId))))
                .ThrowsAsync(new ArgumentException("GraphId is required for edges"));

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() =>
                MockCosmosService.Object.CreateEdgeAsync(invalidEdge));
        }

        [Fact]
        public async Task GetEdges_FiltersEdgesByGraphId()
        {
            // Arrange
            string testGraphId = "specificGraph";
            var testEdges = new List<Edge>
            {
                new Edge { Id = "edge1", Source = "node1", Target = "node2", EdgeType = "connected_to", GraphId = testGraphId, CreatedAt = DateTime.UtcNow }
            };

            // Setup to return edges only for the specific graph ID
            MockCosmosService.Setup(m => m.GetEdges(testGraphId)).ReturnsAsync(testEdges);

            // Setup for a different graph ID to return empty
            MockCosmosService.Setup(m => m.GetEdges("differentGraph")).ReturnsAsync(new List<Edge>());

            // Act
            var result = await MockCosmosService.Object.GetEdges(testGraphId);

            // Assert
            Assert.NotNull(result);
            Assert.Single(result);
            Assert.Equal(testGraphId, result[0].GraphId);

            // Verify the service was called with the correct GraphId
            MockCosmosService.Verify(m => m.GetEdges(testGraphId), Times.Once);
        }
    }
}
