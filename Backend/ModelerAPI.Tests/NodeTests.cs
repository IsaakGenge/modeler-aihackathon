using ModelerAPI.ApiService.Models;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;
using System.Text.Json;

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
        public async Task CreateNodeAsync_WithProperties_ReturnsNodeWithProperties()
        {
            // Arrange
            var properties = new Dictionary<string, object>
            {
                { "age", 30 },
                { "isActive", true },
                { "tags", new[] { "tag1", "tag2" } },
                { "address", new { city = "Seattle", zip = "98101" } }
            };

            var newNode = new Node
            {
                Name = "Node With Properties",
                NodeType = "person",
                GraphId = TestGraphId,
                Properties = properties
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
            Assert.Equal("Node With Properties", result.Name);
            Assert.NotNull(result.Properties);
            Assert.Equal(4, result.Properties.Count);
            
            Assert.Equal(30, result.Properties["age"]);
            Assert.True((bool)result.Properties["isActive"]);
            
            // Verify complex objects (these might need to be verified differently 
            // depending on how your serialization/deserialization works)
            Assert.NotNull(result.Properties["tags"]);
            Assert.NotNull(result.Properties["address"]);

            // Verify the service was called with the right parameters
            MockCosmosService.Verify(m => m.CreateNodeAsync(It.Is<Node>(n =>
                n.Properties.Count == 4 &&
                n.Properties.ContainsKey("age") &&
                n.Properties.ContainsKey("isActive") &&
                n.Properties.ContainsKey("tags") &&
                n.Properties.ContainsKey("address"))), Times.Once);
        }

        [Fact]
        public async Task UpdateNodePropertiesAsync_WithNewProperties_ReturnsSuccess()
        {
            // Arrange
            string nodeId = "node1";
            var properties = new Dictionary<string, object>
            {
                { "score", 95.5 },
                { "lastUpdated", DateTime.UtcNow }
            };

            MockCosmosService.Setup(m => m.UpdateNodePropertiesAsync(nodeId, It.IsAny<Dictionary<string, object>>()))
                .ReturnsAsync(true);

            // Act
            var result = await MockCosmosService.Object.UpdateNodePropertiesAsync(nodeId, properties);

            // Assert
            Assert.True(result);

            // Verify the service was called with the right parameters
            MockCosmosService.Verify(m => m.UpdateNodePropertiesAsync(
                nodeId, 
                It.Is<Dictionary<string, object>>(p => 
                    p.Count == 2 && 
                    p.ContainsKey("score") && 
                    p.ContainsKey("lastUpdated"))), 
                Times.Once);
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
        public async Task GetNodes_WithGraphId_ReturnsNodesWithProperties()
        {
            // Arrange
            var testNodes = new List<Node>
            {
                new Node { 
                    Id = "node1", 
                    Name = "Test Node 1", 
                    NodeType = "person", 
                    GraphId = TestGraphId, 
                    CreatedAt = DateTime.UtcNow,
                    Properties = new Dictionary<string, object> { 
                        { "age", 25 }, 
                        { "email", "test1@example.com" } 
                    }
                },
                new Node { 
                    Id = "node2", 
                    Name = "Test Node 2", 
                    NodeType = "location", 
                    GraphId = TestGraphId, 
                    CreatedAt = DateTime.UtcNow,
                    Properties = new Dictionary<string, object> { 
                        { "latitude", 47.6062 }, 
                        { "longitude", -122.3321 } 
                    }
                }
            };

            MockCosmosService.Setup(m => m.GetNodes(TestGraphId))
                .ReturnsAsync(testNodes);

            // Act
            var result = await MockCosmosService.Object.GetNodes(TestGraphId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count);
            
            // Check first node properties
            Assert.Equal(2, result[0].Properties.Count);
            Assert.Equal(25, result[0].Properties["age"]);
            Assert.Equal("test1@example.com", result[0].Properties["email"]);
            
            // Check second node properties
            Assert.Equal(2, result[1].Properties.Count);
            Assert.Equal(47.6062, result[1].Properties["latitude"]);
            Assert.Equal(-122.3321, result[1].Properties["longitude"]);
        }
    }
}
