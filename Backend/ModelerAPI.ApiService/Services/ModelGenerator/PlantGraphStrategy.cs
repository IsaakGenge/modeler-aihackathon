using ModelerAPI.ApiService.Models;
using ModelerAPI.ApiService.Services;

namespace ModelerAPI.ApiService.Services.ModelGenerator
{
    /// <summary>
    /// Plant graph generation strategy that simulates an industrial plant with production components
    /// </summary>
    public class PlantGraphStrategy : IGraphGenerationStrategy
    {
        private readonly ICosmosService _cosmosService;
        private readonly Random _random = new Random();

        // Component types for the plant simulation
        private readonly string[] _componentTypes = {
        "Boiler", "Pump", "Furnace", "HeatExchanger", "Valve", "Tank", "Pipe", "Sensor",
        "ControlSystem", "Turbine", "Condenser", "Filter", "Compressor", "CoolingTower"
    };

        // Different connection types between components
        private readonly string[] _connectionTypes = {
        "flow_to", "connected_to", "controlled_by", "monitors", "heats", "cools",
        "pressurizes", "filters", "supplies", "receives_from"
    };

        public PlantGraphStrategy(ICosmosService cosmosService)
        {
            _cosmosService = cosmosService ?? throw new ArgumentNullException(nameof(cosmosService));
        }

        public async Task<(string GraphId, List<Node> Nodes, List<Edge> Edges)> GenerateGraphAsync(int nodeCount, string graphName)
        {
            if (nodeCount < 5)
                throw new ArgumentException("Plant graph requires at least 5 nodes for a meaningful simulation", nameof(nodeCount));

            // Create a new graph
            var graphId = Guid.NewGuid().ToString();
            var graph = new Graph
            {
                Id = graphId,
                Name = graphName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DocumentType = "Graph",
                PartitionKey = graphId
            };

            await _cosmosService.CreateItemAsync(graph, graphId);

            // Create nodes representing plant components
            var nodes = new List<Node>();
            var nodeTypes = new List<string>();

            // Ensure we have at least one of each core component type
            var requiredTypes = new[] { "Boiler", "Pump", "Furnace", "ControlSystem", "Sensor" };
            foreach (var type in requiredTypes.Take(Math.Min(nodeCount, requiredTypes.Length)))
            {
                nodeTypes.Add(type);
            }

            // Fill the rest with random component types
            for (int i = nodeTypes.Count; i < nodeCount; i++)
            {
                nodeTypes.Add(_componentTypes[_random.Next(_componentTypes.Length)]);
            }

            // Shuffle the component types for random assignment
            nodeTypes = nodeTypes.OrderBy(x => _random.Next()).ToList();

            // Create nodes with appropriate names based on their type
            for (int i = 0; i < nodeCount; i++)
            {
                var nodeType = nodeTypes[i];
                var nodeName = GetComponentName(nodeType, GetCountOfType(nodeTypes, nodeType, i));

                var node = new Node
                {
                    Name = nodeName,
                    NodeType = nodeType,
                    GraphId = graphId,
                    CreatedAt = DateTime.UtcNow
                };

                var createdNode = await _cosmosService.CreateNodeAsync(node);
                nodes.Add(createdNode);
            }

            // Create edges representing the process flow
            var edges = new List<Edge>();

            // Create a logical process flow structure
            await CreateProcessFlowStructure(nodes, edges, graphId);

            return (graphId, nodes, edges);
        }

        private async Task CreateProcessFlowStructure(List<Node> nodes, List<Edge> edges, string graphId)
        {
            // Find components by type for logical grouping
            var controlSystems = nodes.Where(n => n.NodeType == "ControlSystem").ToList();
            var sensors = nodes.Where(n => n.NodeType == "Sensor").ToList();
            var furnaces = nodes.Where(n => n.NodeType == "Furnace").ToList();
            var boilers = nodes.Where(n => n.NodeType == "Boiler").ToList();
            var pumps = nodes.Where(n => n.NodeType == "Pump").ToList();
            var valves = nodes.Where(n => n.NodeType == "Valve").ToList();
            var heatExchangers = nodes.Where(n => n.NodeType == "HeatExchanger").ToList();
            var tanks = nodes.Where(n => n.NodeType == "Tank").ToList();
            var pipes = nodes.Where(n => n.NodeType == "Pipe").ToList();
            var otherComponents = nodes.Where(n =>
                !controlSystems.Contains(n) &&
                !sensors.Contains(n) &&
                !furnaces.Contains(n) &&
                !boilers.Contains(n) &&
                !pumps.Contains(n) &&
                !valves.Contains(n) &&
                !heatExchangers.Contains(n) &&
                !tanks.Contains(n) &&
                !pipes.Contains(n)).ToList();

            // Connect control systems to sensors
            foreach (var controlSystem in controlSystems)
            {
                foreach (var sensor in sensors)
                {
                    var edge = new Edge
                    {
                        Source = controlSystem.Id,
                        Target = sensor.Id,
                        EdgeType = "monitors",
                        GraphId = graphId,
                        CreatedAt = DateTime.UtcNow
                    };

                    var createdEdge = await _cosmosService.CreateEdgeAsync(edge);
                    edges.Add(createdEdge);
                }

                // Control systems also control pumps and valves
                foreach (var component in pumps.Concat(valves).Take(_random.Next(1, pumps.Count + valves.Count + 1)))
                {
                    var edge = new Edge
                    {
                        Source = controlSystem.Id,
                        Target = component.Id,
                        EdgeType = "controls",
                        GraphId = graphId,
                        CreatedAt = DateTime.UtcNow
                    };

                    var createdEdge = await _cosmosService.CreateEdgeAsync(edge);
                    edges.Add(createdEdge);
                }
            }

            // Connect furnaces to boilers (heat source)
            foreach (var furnace in furnaces)
            {
                foreach (var boiler in boilers.Take(_random.Next(1, boilers.Count + 1)))
                {
                    var edge = new Edge
                    {
                        Source = furnace.Id,
                        Target = boiler.Id,
                        EdgeType = "heats",
                        GraphId = graphId,
                        CreatedAt = DateTime.UtcNow
                    };

                    var createdEdge = await _cosmosService.CreateEdgeAsync(edge);
                    edges.Add(createdEdge);
                }
            }

            // Create flow paths from boilers through the system
            foreach (var boiler in boilers)
            {
                // Start with a pipe or heat exchanger after boiler
                var nextComponents = pipes.Concat(heatExchangers).ToList();
                if (nextComponents.Any())
                {
                    var nextComponent = nextComponents[_random.Next(nextComponents.Count)];
                    var edge = new Edge
                    {
                        Source = boiler.Id,
                        Target = nextComponent.Id,
                        EdgeType = "flow_to",
                        GraphId = graphId,
                        CreatedAt = DateTime.UtcNow
                    };

                    var createdEdge = await _cosmosService.CreateEdgeAsync(edge);
                    edges.Add(createdEdge);

                    // Continue the flow path
                    await CreateFlowPath(nextComponent, edges, graphId, nodes, new HashSet<string> { boiler.Id, nextComponent.Id });
                }
            }

            // Connect remaining components to create a cohesive system
            var connectedNodes = edges.SelectMany(e => new[] { e.Source, e.Target }).Distinct().ToHashSet();
            var unconnectedNodes = nodes.Where(n => !connectedNodes.Contains(n.Id)).ToList();

            foreach (var node in unconnectedNodes)
            {
                if (connectedNodes.Count > 0)
                {
                    var targetNode = nodes.FirstOrDefault(n => connectedNodes.Contains(n.Id));
                    if (targetNode != null)
                    {
                        var edge = new Edge
                        {
                            Source = node.Id,
                            Target = targetNode.Id,
                            EdgeType = GetAppropriateConnectionType(node.NodeType, targetNode.NodeType),
                            GraphId = graphId,
                            CreatedAt = DateTime.UtcNow
                        };

                        var createdEdge = await _cosmosService.CreateEdgeAsync(edge);
                        edges.Add(createdEdge);
                        connectedNodes.Add(node.Id);
                    }
                }
            }
        }

        private async Task CreateFlowPath(Node currentNode, List<Edge> edges, string graphId, List<Node> allNodes, HashSet<string> visitedNodeIds)
        {
            // Prevent infinite recursion and ensure we don't create too many edges
            if (visitedNodeIds.Count > allNodes.Count / 2 || _random.Next(100) < 20)
            {
                // 20% chance to terminate a path
                return;
            }

            // Find suitable next components based on current component type
            var candidates = new List<Node>();

            switch (currentNode.NodeType)
            {
                case "Pipe":
                    candidates = allNodes.Where(n => n.NodeType == "Valve" || n.NodeType == "Pump" ||
                                                   n.NodeType == "HeatExchanger" || n.NodeType == "Tank").ToList();
                    break;
                case "Pump":
                    candidates = allNodes.Where(n => n.NodeType == "Pipe" || n.NodeType == "Valve" ||
                                                   n.NodeType == "HeatExchanger").ToList();
                    break;
                case "Valve":
                    candidates = allNodes.Where(n => n.NodeType == "Pipe" || n.NodeType == "Tank" ||
                                                   n.NodeType == "HeatExchanger").ToList();
                    break;
                case "HeatExchanger":
                    candidates = allNodes.Where(n => n.NodeType == "Pipe" || n.NodeType == "Turbine" ||
                                                   n.NodeType == "Condenser").ToList();
                    break;
                case "Tank":
                    candidates = allNodes.Where(n => n.NodeType == "Pipe" || n.NodeType == "Pump").ToList();
                    break;
                default:
                    // For other components, connect to pipes as a default
                    candidates = allNodes.Where(n => n.NodeType == "Pipe").ToList();
                    break;
            }

            // Filter out already visited nodes
            candidates = candidates.Where(n => !visitedNodeIds.Contains(n.Id)).ToList();

            if (candidates.Count > 0)
            {
                var nextNode = candidates[_random.Next(candidates.Count)];
                var edge = new Edge
                {
                    Source = currentNode.Id,
                    Target = nextNode.Id,
                    EdgeType = "flow_to",
                    GraphId = graphId,
                    CreatedAt = DateTime.UtcNow
                };

                var createdEdge = await _cosmosService.CreateEdgeAsync(edge);
                edges.Add(createdEdge);

                visitedNodeIds.Add(nextNode.Id);

                // Continue building the flow path
                await CreateFlowPath(nextNode, edges, graphId, allNodes, visitedNodeIds);
            }
        }

        private string GetAppropriateConnectionType(string sourceType, string targetType)
        {
            // Return an appropriate connection type based on the source and target component types
            if (sourceType == "ControlSystem")
                return "controls";
            if (sourceType == "Sensor")
                return "monitors";
            if (sourceType == "Furnace" && (targetType == "Boiler" || targetType == "HeatExchanger"))
                return "heats";
            if (sourceType == "Pump")
                return "pumps_to";
            if (sourceType == "Valve")
                return "regulates_flow_to";

            // Default connection type
            return "connected_to";
        }

        private string GetComponentName(string componentType, int count)
        {
            // Generate a descriptive name based on the component type
            switch (componentType)
            {
                case "Boiler":
                    string[] boilerTypes = { "Steam", "Hot Water", "High Pressure", "Recovery" };
                    return $"{boilerTypes[_random.Next(boilerTypes.Length)]} Boiler {count}";

                case "Pump":
                    string[] pumpTypes = { "Centrifugal", "Positive Displacement", "Transfer", "Feedwater", "Circulation" };
                    return $"{pumpTypes[_random.Next(pumpTypes.Length)]} Pump {count}";

                case "Furnace":
                    string[] furnaceTypes = { "Combustion", "Electric", "Gas-fired", "Oil-fired", "Coal" };
                    return $"{furnaceTypes[_random.Next(furnaceTypes.Length)]} Furnace {count}";

                case "Valve":
                    string[] valveTypes = { "Control", "Check", "Relief", "Gate", "Globe", "Ball" };
                    return $"{valveTypes[_random.Next(valveTypes.Length)]} Valve {count}";

                case "Tank":
                    string[] tankTypes = { "Storage", "Buffer", "Feedwater", "Condensate", "Fuel" };
                    return $"{tankTypes[_random.Next(tankTypes.Length)]} Tank {count}";

                case "Sensor":
                    string[] sensorTypes = { "Temperature", "Pressure", "Flow", "Level", "Vibration" };
                    return $"{sensorTypes[_random.Next(sensorTypes.Length)]} Sensor {count}";

                case "ControlSystem":
                    string[] controlTypes = { "PLC", "DCS", "SCADA", "Main", "Local" };
                    return $"{controlTypes[_random.Next(controlTypes.Length)]} Control {count}";

                default:
                    return $"{componentType} {count}";
            }
        }

        private int GetCountOfType(List<string> nodeTypes, string type, int currentIndex)
        {
            // Count how many nodes of this type have already been created
            return nodeTypes.Take(currentIndex).Count(t => t == type) + 1;
        }
    }
}