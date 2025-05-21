using ModelerAPI.ApiService.Models;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;
using System.Text.Json;

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
        public async Task CreateEdgeAsync_WithProperties_ReturnsEdgeWithProperties()
        {
            // Arrange
            var properties = new Dictionary<string, object>
            {
                { "weight", 0.75 },
                { "isDirectional", true },
                { "metadata", new { createdBy = "system", priority = 1 } }
            };

            var newEdge = new Edge
            {
                Source = "node1",
                Target = "node2",
                EdgeType = "depends_on",
                GraphId = TestGraphId,
                Properties = properties
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
            Assert.Equal("depends_on", result.EdgeType);
            
            // Verify properties exist
            Assert.NotNull(result.Properties);
            Assert.Equal(3, result.Properties.Count);
            Assert.Equal(0.75, result.Properties["weight"]);
            Assert.True((bool)result.Properties["isDirectional"]);
            Assert.NotNull(result.Properties["metadata"]);

            // Verify the service was called with the right parameters
            MockCosmosService.Verify(m => m.CreateEdgeAsync(It.Is<Edge>(e =>
                e.Properties.Count == 3 &&
                e.Properties.ContainsKey("weight") &&
                e.Properties.ContainsKey("isDirectional") &&
                e.Properties.ContainsKey("metadata"))), Times.Once);
        }

        [Fact]
        public async Task UpdateEdgePropertiesAsync_WithNewProperties_ReturnsSuccess()
        {
            // Arrange
            string edgeId = "edge1";
            var properties = new Dictionary<string, object>
            {
                { "strength", 0.85 },
                { "timestamp", DateTime.UtcNow }
            };

            MockCosmosService.Setup(m => m.UpdateEdgePropertiesAsync(edgeId, It.IsAny<Dictionary<string, object>>()))
                .ReturnsAsync(true);

            // Act
            var result = await MockCosmosService.Object.UpdateEdgePropertiesAsync(edgeId, properties);

            // Assert
            Assert.True(result);

            // Verify the service was called with the right parameters
            MockCosmosService.Verify(m => m.UpdateEdgePropertiesAsync(
                edgeId, 
                It.Is<Dictionary<string, object>>(p => 
                    p.Count == 2 && 
                    p.ContainsKey("strength") && 
                    p.ContainsKey("timestamp"))), 
                Times.Once);
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
        public async Task GetEdges_WithGraphId_ReturnsEdgesWithProperties()
        {
            // Arrange
            var testEdges = new List<Edge>
            {
                new Edge { 
                    Id = "edge1", 
                    Source = "node1", 
                    Target = "node2", 
                    EdgeType = "connected_to", 
                    GraphId = TestGraphId, 
                    CreatedAt = DateTime.UtcNow,
                    Properties = new Dictionary<string, object> { 
                        { "weight", 1.0 }, 
                        { "relationship", "friend" } 
                    }
                },
                new Edge { 
                    Id = "edge2", 
                    Source = "node2", 
                    Target = "node3", 
                    EdgeType = "depends_on", 
                    GraphId = TestGraphId, 
                    CreatedAt = DateTime.UtcNow,
                    Properties = new Dictionary<string, object> { 
                        { "priority", "high" }, 
                        { "validated", false } 
                    }
                }
            };

            MockCosmosService.Setup(m => m.GetEdges(TestGraphId))
                .ReturnsAsync(testEdges);

            // Act
            var result = await MockCosmosService.Object.GetEdges(TestGraphId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Count);
            
            // Check first edge properties
            Assert.Equal(2, result[0].Properties.Count);
            Assert.Equal(1.0, result[0].Properties["weight"]);
            Assert.Equal("friend", result[0].Properties["relationship"]);
            
            // Check second edge properties
            Assert.Equal(2, result[1].Properties.Count);
            Assert.Equal("high", result[1].Properties["priority"]);
            Assert.False((bool)result[1].Properties["validated"]);
        }
    }
}
