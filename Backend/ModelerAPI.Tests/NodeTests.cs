using ModelerAPI.ApiService.Models;
using Moq;

namespace ModelerAPI.Tests
{
    public class NodeTests : TestBase
    {
        private const string TestGraphId = "graph1"; // Consistent test GraphId

        [Fact]
        public async Task GetNodes_ReturnsAllNodes()
        {
            // Arrange
            var testNodes = new List<Node>
            {
                new Node { Id = "node1", Name = "Test Node 1", NodeType = "person", GraphId = TestGraphId, CreatedAt = DateTime.UtcNow },
                new Node { Id = "node2", Name = "Test Node 2", NodeType = "location", GraphId = TestGraphId, CreatedAt = DateTime.UtcNow }
            };

            // Updated to include GraphId parameter
            MockCosmosService.Setup(m => m.GetNodes(TestGraphId)).ReturnsAsync(testNodes);

            // Act
            var result = await MockCosmosService.Object.GetNodes(TestGraphId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count);
            Assert.Equal("Test Node 1", result[0].Name);
            Assert.Equal("Test Node 2", result[1].Name);
            Assert.Equal(TestGraphId, result[0].GraphId);
            Assert.Equal(TestGraphId, result[1].GraphId);

            // Verify the service was called with the GraphId
            MockCosmosService.Verify(m => m.GetNodes(TestGraphId), Times.Once);
        }

        [Fact]
        public async Task GetNodes_WithoutGraphId_ReturnsAllNodes()
        {
            // Arrange
            var testNodes = new List<Node>
            {
                new Node { Id = "node1", Name = "Test Node 1", NodeType = "person", GraphId = "graph1", CreatedAt = DateTime.UtcNow },
                new Node { Id = "node2", Name = "Test Node 2", NodeType = "location", GraphId = "graph2", CreatedAt = DateTime.UtcNow }
            };

            // Setup for null or empty GraphId parameter
            MockCosmosService.Setup(m => m.GetNodes(It.Is<string>(s => string.IsNullOrEmpty(s)))).ReturnsAsync(testNodes);

            // Act
            var result = await MockCosmosService.Object.GetNodes(null);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count);

            // Verify the service was called with null GraphId
            MockCosmosService.Verify(m => m.GetNodes(It.Is<string>(s => string.IsNullOrEmpty(s))), Times.Once);
        }

        [Fact]
        public async Task CreateNodeAsync_CreatesAndReturnsNode()
        {
            // Arrange
            var newNode = new Node
            {
                Name = "New Test Node",
                NodeType = "system",
                GraphId = TestGraphId // Added required GraphId
            };

            // Mock setup is in the base class

            // Act
            var result = await MockCosmosService.Object.CreateNodeAsync(newNode);

            // Assert
            Assert.NotNull(result);
            Assert.NotNull(result.Id); // ID should be assigned
            Assert.Equal("New Test Node", result.Name);
            Assert.Equal("system", result.NodeType);
            Assert.Equal(TestGraphId, result.GraphId); // Verify GraphId was maintained

            // Verify the service was called with the right parameters
            MockCosmosService.Verify(m => m.CreateNodeAsync(It.Is<Node>(n =>
                n.Name == "New Test Node" &&
                n.NodeType == "system" &&
                n.GraphId == TestGraphId)), Times.Once);
        }

        [Fact]
        public async Task DeleteNodeAsync_ReturnsTrue_WhenSuccessful()
        {
            // Arrange
            string nodeId = "node1";
            MockCosmosService.Setup(m => m.DeleteNodeAsync(nodeId)).ReturnsAsync(true);

            // Act
            var result = await MockCosmosService.Object.DeleteNodeAsync(nodeId);

            // Assert
            Assert.True(result);

            // Verify the service was called with the correct ID
            MockCosmosService.Verify(m => m.DeleteNodeAsync(nodeId), Times.Once);
        }

        [Fact]
        public async Task DeleteNodeAsync_ReturnsFalse_WhenNodeNotFound()
        {
            // Arrange
            string nodeId = "nonexistent";
            MockCosmosService.Setup(m => m.DeleteNodeAsync(nodeId)).ReturnsAsync(false);

            // Act
            var result = await MockCosmosService.Object.DeleteNodeAsync(nodeId);

            // Assert
            Assert.False(result);

            // Verify the service was called with the correct ID
            MockCosmosService.Verify(m => m.DeleteNodeAsync(nodeId), Times.Once);
        }

        [Fact]
        public async Task CreateNodeAsync_ValidatesName()
        {
            // Arrange
            var invalidNode = new Node
            {
                Name = "", // Empty name
                NodeType = "system",
                GraphId = TestGraphId
            };

            MockCosmosService.Setup(m => m.CreateNodeAsync(It.Is<Node>(n =>
                string.IsNullOrEmpty(n.Name))))
                .ThrowsAsync(new ArgumentException("Node name is required"));

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() =>
                MockCosmosService.Object.CreateNodeAsync(invalidNode));
        }

        [Fact]
        public async Task CreateNodeAsync_ValidatesGraphId()
        {
            // Arrange
            var invalidNode = new Node
            {
                Name = "Test Node",
                NodeType = "system",
                GraphId = "" // Empty GraphId
            };

            MockCosmosService.Setup(m => m.CreateNodeAsync(It.Is<Node>(n =>
                string.IsNullOrEmpty(n.GraphId))))
                .ThrowsAsync(new ArgumentException("GraphId is required for nodes"));

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() =>
                MockCosmosService.Object.CreateNodeAsync(invalidNode));
        }

        [Fact]
        public async Task GetNodes_FiltersNodesByGraphId()
        {
            // Arrange
            string testGraphId = "specificGraph";
            var testNodes = new List<Node>
            {
                new Node { Id = "node1", Name = "Test Node 1", NodeType = "person", GraphId = testGraphId, CreatedAt = DateTime.UtcNow }
            };

            // Setup to return nodes only for the specific graph ID
            MockCosmosService.Setup(m => m.GetNodes(testGraphId)).ReturnsAsync(testNodes);

            // Setup for a different graph ID to return empty
            MockCosmosService.Setup(m => m.GetNodes("differentGraph")).ReturnsAsync(new List<Node>());

            // Act
            var result = await MockCosmosService.Object.GetNodes(testGraphId);

            // Assert
            Assert.NotNull(result);
            Assert.Single(result);
            Assert.Equal(testGraphId, result[0].GraphId);

            // Verify the service was called with the correct GraphId
            MockCosmosService.Verify(m => m.GetNodes(testGraphId), Times.Once);
        }
    }
}

