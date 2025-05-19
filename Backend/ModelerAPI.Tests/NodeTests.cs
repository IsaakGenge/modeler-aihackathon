using ModelerAPI.ApiService.Models;
using Moq;

namespace ModelerAPI.Tests
{
    public class NodeTests : TestBase
    {
        [Fact]
        public async Task GetNodes_ReturnsAllNodes()
        {
            // Arrange
            var testNodes = new List<Node>
            {
                new Node { Id = "node1", Name = "Test Node 1", NodeType = "person", CreatedAt = DateTime.UtcNow },
                new Node { Id = "node2", Name = "Test Node 2", NodeType = "location", CreatedAt = DateTime.UtcNow }
            };

            MockCosmosService.Setup(m => m.GetNodes()).ReturnsAsync(testNodes);

            // Act
            var result = await MockCosmosService.Object.GetNodes();

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count);
            Assert.Equal("Test Node 1", result[0].Name);
            Assert.Equal("Test Node 2", result[1].Name);

            // Verify the service was called
            MockCosmosService.Verify(m => m.GetNodes(), Times.Once);
        }

        [Fact]
        public async Task CreateNodeAsync_CreatesAndReturnsNode()
        {
            // Arrange
            var newNode = new Node
            {
                Name = "New Test Node",
                NodeType = "system"
            };

            // Mock setup is in the base class

            // Act
            var result = await MockCosmosService.Object.CreateNodeAsync(newNode);

            // Assert
            Assert.NotNull(result);
            Assert.NotNull(result.Id); // ID should be assigned
            Assert.Equal("New Test Node", result.Name);
            Assert.Equal("system", result.NodeType);

            // Verify the service was called with the right parameters
            MockCosmosService.Verify(m => m.CreateNodeAsync(It.Is<Node>(n =>
                n.Name == "New Test Node" && n.NodeType == "system")), Times.Once);
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
    }
}
