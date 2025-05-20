using Microsoft.Extensions.DependencyInjection;
using ModelerAPI.ApiService.Models;
using ModelerAPI.ApiService.Services;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace ModelerAPI.Tests
{
    public abstract class TestBase
    {
        protected readonly ServiceProvider ServiceProvider;
        protected readonly Mock<ICosmosService> MockCosmosService;

        // Standard test GraphId to use across all tests
        protected const string DefaultTestGraphId = "test-graph-1";

        protected TestBase()
        {
            // Create a mock of the Cosmos service
            MockCosmosService = new Mock<ICosmosService>();

            // Setup the service collection
            var services = new ServiceCollection();

            // Register the mock service
            services.AddSingleton(MockCosmosService.Object);

            // Add other required services here
            // e.g., services.AddLogging();

            // Build the service provider
            ServiceProvider = services.BuildServiceProvider();

            // Configure standard mock behaviors
            SetupDefaultMocks();
        }

        protected virtual void SetupDefaultMocks()
        {
            // Setup default node data with GraphId
            var testNodes = new List<Node>
            {
                new Node { Id = "node1", Name = "Test Node 1", NodeType = "person", GraphId = DefaultTestGraphId, CreatedAt = DateTime.UtcNow },
                new Node { Id = "node2", Name = "Test Node 2", NodeType = "location", GraphId = DefaultTestGraphId, CreatedAt = DateTime.UtcNow }
            };

            // Setup default edge data with GraphId
            var testEdges = new List<Edge>
            {
                new Edge { Id = "edge1", Source = "node1", Target = "node2", EdgeType = "connected_to", GraphId = DefaultTestGraphId, CreatedAt = DateTime.UtcNow }
            };

            // Setup common mocks with and without GraphId parameter
            MockCosmosService.Setup(m => m.GetNodes(It.Is<string>(s => string.IsNullOrEmpty(s)))).ReturnsAsync(testNodes);
            MockCosmosService.Setup(m => m.GetNodes(DefaultTestGraphId)).ReturnsAsync(testNodes);

            MockCosmosService.Setup(m => m.GetEdges(It.Is<string>(s => string.IsNullOrEmpty(s)))).ReturnsAsync(testEdges);
            MockCosmosService.Setup(m => m.GetEdges(DefaultTestGraphId)).ReturnsAsync(testEdges);

            // Setup CreateNodeAsync to return the input node with an ID and validate GraphId
            MockCosmosService.Setup(m => m.CreateNodeAsync(It.Is<Node>(n => !string.IsNullOrEmpty(n.GraphId))))
                .ReturnsAsync((Node node) =>
                {
                    node.Id = Guid.NewGuid().ToString();
                    return node;
                });

            // Setup rejection for nodes without GraphId
            MockCosmosService.Setup(m => m.CreateNodeAsync(It.Is<Node>(n => string.IsNullOrEmpty(n.GraphId))))
                .ThrowsAsync(new ArgumentException("GraphId is required for nodes"));

            // Setup CreateEdgeAsync to return the input edge with an ID and validate GraphId
            MockCosmosService.Setup(m => m.CreateEdgeAsync(It.Is<Edge>(e => !string.IsNullOrEmpty(e.GraphId))))
                .ReturnsAsync((Edge edge) =>
                {
                    edge.Id = Guid.NewGuid().ToString();
                    return edge;
                });

            // Setup rejection for edges without GraphId
            MockCosmosService.Setup(m => m.CreateEdgeAsync(It.Is<Edge>(e => string.IsNullOrEmpty(e.GraphId))))
                .ThrowsAsync(new ArgumentException("GraphId is required for edges"));

            // Setup DeleteNodeAsync to return true
            MockCosmosService.Setup(m => m.DeleteNodeAsync(It.IsAny<string>()))
                .ReturnsAsync(true);

            // Setup DeleteEdgeAsync to return true
            MockCosmosService.Setup(m => m.DeleteEdgeAsync(It.IsAny<string>()))
                .ReturnsAsync(true);
        }
    }
}
