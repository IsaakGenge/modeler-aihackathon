using ModelerAPI.ApiService.Models;
using System.Collections.Generic;

namespace ModelerAPI.ApiService.Services.ModelGenerator
{
    public class PlantGraphStrategy2 : IGraphGenerationStrategy
    {
        private readonly Random _random = new Random();
        private readonly ICosmosService _cosmosService;

        public PlantGraphStrategy2(ICosmosService cosmosService)
        {
            _cosmosService = cosmosService;
        }

        public async Task<(string GraphId, List<Node> Nodes, List<Edge> Edges)> GenerateGraphAsync(int nodeCount, string graphName)
        {
            // Ensure minimum nodes for a meaningful cooling water system
            nodeCount = Math.Max(nodeCount, 8);

            // Create a new graph with the provided name
            var graphId = Guid.NewGuid().ToString();
            var graph = new Graph
            {
                Id = graphId,
                Name = graphName ?? "Cooling Water System",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DocumentType = "Graph",
                PartitionKey = graphId  // Important: Set partition key to graphId
            };

            // Store the graph in Cosmos DB
            await _cosmosService.CreateItemAsync(graph, graphId);

            var nodes = new List<Node>();
            var edges = new List<Edge>();

            try
            {
                // Create main cooling water pump
                var mainPump = await CreateAndStoreNode(graphId, "CW-P-001", NodeTypes.Types.Pump, "Main Cooling Water Pump");
                nodes.Add(mainPump);

                // Create backup cooling water pump
                var backupPump = await CreateAndStoreNode(graphId, "CW-P-002", NodeTypes.Types.Pump, "Backup Cooling Water Pump");
                nodes.Add(backupPump);

                // Create cooling tower
                var coolingTower = await CreateAndStoreNode(graphId, "CW-CT-001", NodeTypes.Types.CoolingTower, "Main Cooling Tower");
                nodes.Add(coolingTower);

                // Create collection header
                var coldHeader = await CreateAndStoreNode(graphId, "CW-T-001", NodeTypes.Types.Pipe, "Cold Water Header");
                nodes.Add(coldHeader);

                // Create return header
                var hotHeader = await CreateAndStoreNode(graphId, "CW-T-002", NodeTypes.Types.Pipe, "Hot Water Header");
                nodes.Add(hotHeader);

                // Create control system
                var controlSystem = await CreateAndStoreNode(graphId, "CW-CS-001", NodeTypes.Types.ControlSystem, "Cooling Water Control System");
                nodes.Add(controlSystem);

                // Create temperature sensors
                var tempSensor1 = await CreateAndStoreNode(graphId, "CW-TE-001", NodeTypes.Types.Sensor, "Supply Temperature Sensor");
                var tempSensor2 = await CreateAndStoreNode(graphId, "CW-TE-002", NodeTypes.Types.Sensor, "Return Temperature Sensor");
                nodes.Add(tempSensor1);
                nodes.Add(tempSensor2);

                // Create heat exchangers (number depends on nodeCount)
                var heatExchangerCount = (nodeCount - 8) / 2; // Remaining nodes split between exchangers and valves
                for (int i = 0; i < heatExchangerCount; i++)
                {
                    var hx = await CreateAndStoreNode(graphId, $"CW-HX-{(i + 1):D3}", NodeTypes.Types.HeatExchanger, $"Heat Exchanger {i + 1}");
                    var valve = await CreateAndStoreNode(graphId, $"CW-V-{(i + 1):D3}", NodeTypes.Types.Valve, $"Control Valve {i + 1}");
                    nodes.Add(hx);
                    nodes.Add(valve);

                    // Connect heat exchanger to headers through valve
                    var edge1 = await CreateAndStoreEdge(graphId, coldHeader.Id, valve.Id, EdgeType.Types.FlowTo);
                    var edge2 = await CreateAndStoreEdge(graphId, valve.Id, hx.Id, EdgeType.Types.RegulatesFlowTo);
                    var edge3 = await CreateAndStoreEdge(graphId, hx.Id, hotHeader.Id, EdgeType.Types.FlowTo);
                    edges.AddRange(new[] { edge1, edge2, edge3 });
                }

                // Connect main components
                var mainEdges = new[]
                {
            await CreateAndStoreEdge(graphId, mainPump.Id, coldHeader.Id, EdgeType.Types.PumpsTo),
            await CreateAndStoreEdge(graphId, backupPump.Id, coldHeader.Id, EdgeType.Types.PumpsTo),
            await CreateAndStoreEdge(graphId, hotHeader.Id, coolingTower.Id, EdgeType.Types.FlowTo),
            await CreateAndStoreEdge(graphId, coolingTower.Id, mainPump.Id, EdgeType.Types.FlowTo),
            await CreateAndStoreEdge(graphId, coolingTower.Id, backupPump.Id, EdgeType.Types.FlowTo)
        };
                edges.AddRange(mainEdges);

                // Connect sensors and control system
                var controlEdges = new[]
                {
            await CreateAndStoreEdge(graphId, tempSensor1.Id, coldHeader.Id, EdgeType.Types.Monitors),
            await CreateAndStoreEdge(graphId, tempSensor2.Id, hotHeader.Id, EdgeType.Types.Monitors),
            await CreateAndStoreEdge(graphId, controlSystem.Id, mainPump.Id, EdgeType.Types.Controls),
            await CreateAndStoreEdge(graphId, controlSystem.Id, backupPump.Id, EdgeType.Types.Controls),
            await CreateAndStoreEdge(graphId, tempSensor1.Id, controlSystem.Id, EdgeType.Types.ConnectedTo),
            await CreateAndStoreEdge(graphId, tempSensor2.Id, controlSystem.Id, EdgeType.Types.ConnectedTo)
        };
                edges.AddRange(controlEdges);

                return (graphId, nodes, edges);
            }
            catch (Exception ex)
            {
                // If anything fails, clean up the created graph and throw
                await _cosmosService.DeleteItemAsync(graphId, graphId);
                throw new Exception($"Failed to generate plant graph: {ex.Message}", ex);
            }
        }
        private async Task<Node> CreateAndStoreNode(string graphId, string id, string type, string name)
        {
            var node = new Node
            {
                Id = id,
                GraphId = graphId,  // Set the graph ID
                Name = name,
                NodeType = type,
                CreatedAt = DateTime.UtcNow,
                Properties = new Dictionary<string, object>
                {
                    ["equipment_id"] = id,
                    ["description"] = name
                }
            };

            // Store the node in Cosmos DB using graphId as partition key
            return await _cosmosService.CreateNodeAsync(node);
        }

        private async Task<Edge> CreateAndStoreEdge(string graphId, string sourceId, string targetId, string type)
        {
            var edge = new Edge
            {
                Id = $"E-{Guid.NewGuid():N}",
                GraphId = graphId,  // Set the graph ID
                Source = sourceId,
                Target = targetId,
                EdgeType = type,
                CreatedAt = DateTime.UtcNow,
                Properties = new Dictionary<string, object>()
            };

            // Store the edge in Cosmos DB using graphId as partition key
            return await _cosmosService.CreateEdgeAsync(edge);
        }
    }
}