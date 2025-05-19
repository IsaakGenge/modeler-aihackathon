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
            // Setup default node data
            var testNodes = new List<Node>
            {
                new Node { Id = "node1", Name = "Test Node 1", NodeType = "person", CreatedAt = DateTime.UtcNow },
                new Node { Id = "node2", Name = "Test Node 2", NodeType = "location", CreatedAt = DateTime.UtcNow }
            };

            // Setup default edge data
            var testEdges = new List<Edge>
            {
                new Edge { Id = "edge1", Source = "node1", Target = "node2", EdgeType = "connected_to", CreatedAt = DateTime.UtcNow }
            };

            // Setup common mocks
            MockCosmosService.Setup(m => m.GetNodes()).ReturnsAsync(testNodes);
            MockCosmosService.Setup(m => m.GetEdges()).ReturnsAsync(testEdges);

            // Setup CreateNodeAsync to return the input node with an ID
            MockCosmosService.Setup(m => m.CreateNodeAsync(It.IsAny<Node>()))
                .ReturnsAsync((Node node) =>
                {
                    node.Id = Guid.NewGuid().ToString();
                    return node;
                });

            // Setup CreateEdgeAsync to return the input edge with an ID
            MockCosmosService.Setup(m => m.CreateEdgeAsync(It.IsAny<Edge>()))
                .ReturnsAsync((Edge edge) =>
                {
                    edge.Id = Guid.NewGuid().ToString();
                    return edge;
                });

            // Setup DeleteNodeAsync to return true
            MockCosmosService.Setup(m => m.DeleteNodeAsync(It.IsAny<string>()))
                .ReturnsAsync(true);

            // Setup DeleteEdgeAsync to return true
            MockCosmosService.Setup(m => m.DeleteEdgeAsync(It.IsAny<string>()))
                .ReturnsAsync(true);
        }
    }
}
