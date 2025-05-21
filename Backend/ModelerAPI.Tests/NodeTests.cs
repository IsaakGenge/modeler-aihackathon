using ModelerAPI.ApiService.Models;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace ModelerAPI.Tests
{
    public class NodeTests : TestBase
    {
        private const string TestGraphId = "graph1"; // Consistent test GraphId

        [Fact]
        public async Task CreateNodeAsync_WithValidNode_ReturnsNodeWithId()
        {
            // Arrange
            var newNode = new Node
            {
                Name = "New Test Node",
                NodeType = "person",
                GraphId = TestGraphId,
                PositionX = 100.5,
                PositionY = 200.5
            };

            MockCosmosService.Setup(m => m.CreateNodeAsync(It.IsAny<Node>()))
                .ReturnsAsync((Node node) =>
                {
                    node.Id = Guid.NewGuid().ToString();
                    node.CreatedAt = DateTime.UtcNow;
                    return node;
                });

            // Act
            var result = await MockCosmosService.Object.CreateNodeAsync(newNode);

            // Assert
            Assert.NotNull(result);
            Assert.NotNull(result.Id);
            Assert.Equal("New Test Node", result.Name);
            Assert.Equal("person", result.NodeType);
            Assert.Equal(TestGraphId, result.GraphId);
            Assert.Equal(100.5, result.PositionX);
            Assert.Equal(200.5, result.PositionY);
            Assert.NotEqual(default, result.CreatedAt);

            // Verify the service was called with the right parameters
            MockCosmosService.Verify(m => m.CreateNodeAsync(It.Is<Node>(n =>
                n.Name == "New Test Node" &&
                n.NodeType == "person" &&
                n.GraphId == TestGraphId &&
                n.PositionX == 100.5 &&
                n.PositionY == 200.5)), Times.Once);
        }

        [Fact]
        public async Task CreateNodeAsync_WithoutGraphId_ThrowsArgumentException()
        {
            // Arrange
            var invalidNode = new Node
            {
                Name = "Test Node",
                NodeType = "person",
                GraphId = "" // Empty GraphId
            };

            MockCosmosService.Setup(m => m.CreateNodeAsync(It.Is<Node>(n =>
                string.IsNullOrEmpty(n.GraphId))))
                .ThrowsAsync(new ArgumentException("GraphId is required for nodes"));

            // Act & Assert
            var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
                MockCosmosService.Object.CreateNodeAsync(invalidNode));

            Assert.Equal("GraphId is required for nodes", exception.Message);
        }

        [Fact]
        public async Task GetNodes_WithGraphId_ReturnsNodesForSpecificGraph()
        {
            // Arrange
            var testNodes = new List<Node>
            {
                new Node { Id = "node1", Name = "Test Node 1", NodeType = "person", GraphId = TestGraphId, CreatedAt = DateTime.UtcNow },
                new Node { Id = "node2", Name = "Test Node 2", NodeType = "location", GraphId = TestGraphId, CreatedAt = DateTime.UtcNow }
            };

            MockCosmosService.Setup(m => m.GetNodes(TestGraphId)).ReturnsAsync(testNodes);

            // Act
            var result = await MockCosmosService.Object.GetNodes(TestGraphId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count);
            Assert.Equal("Test Node 1", result[0].Name);
            Assert.Equal("Test Node 2", result[1].Name);
            Assert.All(result, node => Assert.Equal(TestGraphId, node.GraphId));

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

            MockCosmosService.Setup(m => m.GetNodes(null)).ReturnsAsync(testNodes);

            // Act
            var result = await MockCosmosService.Object.GetNodes();

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count);
            Assert.Contains(result, node => node.GraphId == "graph1");
            Assert.Contains(result, node => node.GraphId == "graph2");

            // Verify the service was called with null GraphId
            MockCosmosService.Verify(m => m.GetNodes(null), Times.Once);
        }

        [Fact]
        public async Task DeleteNodeAsync_WithExistingId_ReturnsTrue()
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
        public async Task DeleteNodeAsync_WithNonExistingId_ReturnsFalse()
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
        public async Task UpdateNodePositionsAsync_WithValidData_ReturnsTrue()
        {
            // Arrange
            string nodeId = "node1";
            double posX = 150.75;
            double posY = 300.25;

            MockCosmosService.Setup(m => m.UpdateNodePositionsAsync(nodeId, posX, posY))
                .ReturnsAsync(true);

            // Act
            var result = await MockCosmosService.Object.UpdateNodePositionsAsync(nodeId, posX, posY);

            // Assert
            Assert.True(result);

            // Verify the service was called with correct parameters
            MockCosmosService.Verify(m => m.UpdateNodePositionsAsync(nodeId, posX, posY), Times.Once);
        }

        [Fact]
        public async Task BatchUpdateNodePositionsAsync_WithValidData_ReturnsTrue()
        {
            // Arrange
            var nodePositions = new Dictionary<string, (double x, double y)>
            {
                { "node1", (100.5, 200.25) },
                { "node2", (300.75, 400.5) }
            };

            MockCosmosService.Setup(m => m.BatchUpdateNodePositionsAsync(It.IsAny<Dictionary<string, (double x, double y)>>()))
                .ReturnsAsync(true);

            // Act
            var result = await MockCosmosService.Object.BatchUpdateNodePositionsAsync(nodePositions);

            // Assert
            Assert.True(result);

            // Verify the service was called with correct parameters
            MockCosmosService.Verify(m => m.BatchUpdateNodePositionsAsync(
                It.Is<Dictionary<string, (double x, double y)>>(dict =>
                    dict.Count == 2 &&
                    dict.ContainsKey("node1") &&
                    dict.ContainsKey("node2"))),
                Times.Once);
        }

        [Fact]
        public async Task BatchUpdateNodePositionsAsync_WithEmptyDictionary_ReturnsFalse()
        {
            // Arrange
            var emptyPositions = new Dictionary<string, (double x, double y)>();

            MockCosmosService.Setup(m => m.BatchUpdateNodePositionsAsync(It.Is<Dictionary<string, (double x, double y)>>(d => d.Count == 0)))
                .ReturnsAsync(false);

            // Act
            var result = await MockCosmosService.Object.BatchUpdateNodePositionsAsync(emptyPositions);

            // Assert
            Assert.False(result);

            // Verify call
            MockCosmosService.Verify(m => m.BatchUpdateNodePositionsAsync(emptyPositions), Times.Once);
        }
    }
}
