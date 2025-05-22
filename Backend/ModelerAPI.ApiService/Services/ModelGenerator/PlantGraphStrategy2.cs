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
                GraphId = graphId,
                Name = name,
                NodeType = type,
                CreatedAt = DateTime.UtcNow,
                Properties = GenerateNodeProperties(type, id, name)
            };

            // Store the node in Cosmos DB using graphId as partition key
            return await _cosmosService.CreateNodeAsync(node);
        }

        private Dictionary<string, object> GenerateNodeProperties(string nodeType, string id, string name)
        {
            var properties = new Dictionary<string, object>();
            var random = new Random();

            // Add common properties for all node types
            properties["equipment_id"] = id;
            properties["description"] = name;
            properties["manufacturer"] = random.Next(0, 7) switch
            {
                0 => "Siemens",
                1 => "ABB",
                2 => "Schneider Electric",
                3 => "Emerson",
                4 => "Honeywell",
                5 => "Yokogawa",
                6 => "Endress+Hauser",
                _ => "Generic"
            };
            properties["installation_date"] = DateTime.UtcNow.AddDays(-random.Next(365, 3650)).ToString("yyyy-MM-dd");
            properties["last_maintenance"] = DateTime.UtcNow.AddDays(-random.Next(0, 180)).ToString("yyyy-MM-dd");
            properties["maintenance_interval_days"] = random.Next(90, 365);

            // Add specific properties based on node type
            switch (nodeType)
            {
                case NodeTypes.Types.Pump:
                    properties["type"] = random.Next(0, 3) switch
                    {
                        0 => "Centrifugal",
                        1 => "Positive Displacement",
                        2 => "Turbine",
                        _ => "Centrifugal"
                    };
                    properties["capacity"] = Math.Round(random.NextDouble() * 1000 + 500, 2);  // 500-1500 m³/h
                    properties["head"] = Math.Round(random.NextDouble() * 50 + 20, 2);         // 20-70 meters
                    properties["power_rating"] = Math.Round(random.NextDouble() * 500 + 100, 2); // 100-600 kW
                    properties["rpm"] = random.Next(1200, 3600);
                    properties["efficiency"] = Math.Round(random.NextDouble() * 15 + 80, 1);   // 80-95%
                    properties["seal_type"] = random.Next(0, 2) == 0 ? "Mechanical" : "Packed";
                    properties["is_backup"] = id.Contains("002");  // Backup pump check
                    break;

                case NodeTypes.Types.CoolingTower:
                    properties["type"] = random.Next(0, 3) switch
                    {
                        0 => "Natural Draft",
                        1 => "Mechanical Draft",
                        2 => "Induced Draft",
                        _ => "Mechanical Draft"
                    };
                    properties["cooling_capacity"] = Math.Round(random.NextDouble() * 5000 + 2000, 2); // 2000-7000 kW
                    properties["approach_temperature"] = Math.Round(random.NextDouble() * 5 + 3, 1);   // 3-8°C
                    properties["drift_loss"] = Math.Round(random.NextDouble() * 0.01 + 0.001, 4);      // 0.001-0.011%
                    properties["fan_power"] = Math.Round(random.NextDouble() * 150 + 50, 2);           // 50-200 kW
                    properties["water_flow_rate"] = Math.Round(random.NextDouble() * 1000 + 500, 2);   // 500-1500 m³/h
                    properties["basin_volume"] = Math.Round(random.NextDouble() * 500 + 100, 2);       // 100-600 m³
                    break;

                case NodeTypes.Types.Pipe:
                    var isHot = name.Contains("Hot");
                    properties["material"] = random.Next(0, 4) switch
                    {
                        0 => "Carbon Steel",
                        1 => "Stainless Steel",
                        2 => "PVC",
                        3 => "HDPE",
                        _ => "Carbon Steel"
                    };
                    properties["diameter"] = random.Next(6, 48);  // 6-48 inches
                    properties["length"] = Math.Round(random.NextDouble() * 200 + 10, 2);  // 10-210 meters
                    properties["design_pressure"] = Math.Round(random.NextDouble() * 10 + 5, 2);  // 5-15 bar
                    properties["insulation"] = isHot ? "Yes" : "No";
                    properties["temperature_range"] = isHot
                        ? $"{random.Next(40, 60)}-{random.Next(70, 90)}°C"
                        : $"{random.Next(15, 25)}-{random.Next(30, 40)}°C";
                    properties["flow_capacity"] = Math.Round(random.NextDouble() * 2000 + 500, 2);  // 500-2500 m³/h
                    break;

                case NodeTypes.Types.ControlSystem:
                    properties["platform"] = random.Next(0, 4) switch
                    {
                        0 => "Siemens PCS 7",
                        1 => "ABB 800xA",
                        2 => "Emerson DeltaV",
                        3 => "Honeywell Experion",
                        _ => "Custom"
                    };
                    properties["controller_type"] = random.Next(0, 3) switch
                    {
                        0 => "PLC",
                        1 => "DCS",
                        2 => "SCADA",
                        _ => "PLC"
                    };
                    properties["redundancy"] = random.Next(0, 2) == 0 ? "Yes" : "No";
                    properties["io_count"] = random.Next(100, 1000);
                    properties["software_version"] = $"{random.Next(1, 9)}.{random.Next(0, 9)}.{random.Next(0, 20)}";
                    properties["cpu_utilization"] = Math.Round(random.NextDouble() * 30 + 10, 1);  // 10-40%
                    properties["memory_utilization"] = Math.Round(random.NextDouble() * 40 + 20, 1);  // 20-60%
                    properties["communication_protocol"] = random.Next(0, 4) switch
                    {
                        0 => "OPC UA",
                        1 => "Modbus TCP",
                        2 => "Profinet",
                        3 => "Foundation Fieldbus",
                        _ => "OPC UA"
                    };
                    break;

                case NodeTypes.Types.Sensor:
                    var isTempSensor = name.Contains("Temperature");
                    properties["type"] = isTempSensor ? "Temperature" : random.Next(0, 4) switch
                    {
                        0 => "Pressure",
                        1 => "Flow",
                        2 => "Level",
                        3 => "pH",
                        _ => "Temperature"
                    };

                    if (isTempSensor)
                    {
                        properties["range"] = $"0-100°C";
                        properties["accuracy"] = $"±{Math.Round(random.NextDouble() * 0.5 + 0.1, 2)}°C";
                        properties["sensor_type"] = random.Next(0, 3) switch
                        {
                            0 => "RTD",
                            1 => "Thermocouple",
                            2 => "Thermistor",
                            _ => "RTD"
                        };
                    }
                    else
                    {
                        properties["range"] = $"0-{random.Next(5, 20)} bar";
                        properties["accuracy"] = $"±{Math.Round(random.NextDouble() * 0.5 + 0.1, 2)}%";
                    }

                    properties["signal_type"] = random.Next(0, 3) switch
                    {
                        0 => "4-20mA",
                        1 => "0-10V",
                        2 => "HART",
                        _ => "4-20mA"
                    };
                    properties["calibration_date"] = DateTime.UtcNow.AddDays(-random.Next(0, 365)).ToString("yyyy-MM-dd");
                    properties["calibration_due"] = DateTime.UtcNow.AddDays(random.Next(30, 365)).ToString("yyyy-MM-dd");
                    properties["is_critical"] = random.Next(0, 2) == 0 ? true : false;
                    properties["response_time_ms"] = random.Next(100, 2000);
                    break;

                case NodeTypes.Types.HeatExchanger:
                    properties["type"] = random.Next(0, 4) switch
                    {
                        0 => "Shell and Tube",
                        1 => "Plate",
                        2 => "Air-Cooled",
                        3 => "Spiral",
                        _ => "Shell and Tube"
                    };
                    properties["heat_transfer_area"] = Math.Round(random.NextDouble() * 500 + 50, 2);  // 50-550 m²
                    properties["design_pressure"] = Math.Round(random.NextDouble() * 15 + 5, 2);       // 5-20 bar
                    properties["design_temperature"] = random.Next(80, 200);                           // 80-200°C
                    properties["heat_duty"] = Math.Round(random.NextDouble() * 5000 + 500, 2);         // 500-5500 kW
                    properties["tube_material"] = random.Next(0, 3) switch
                    {
                        0 => "Stainless Steel",
                        1 => "Copper",
                        2 => "Titanium",
                        _ => "Stainless Steel"
                    };
                    properties["shell_material"] = "Carbon Steel";
                    properties["fouling_factor"] = Math.Round(random.NextDouble() * 0.0003 + 0.0001, 6);
                    properties["overall_heat_transfer_coefficient"] = Math.Round(random.NextDouble() * 3000 + 1000, 2);  // 1000-4000 W/m²K
                    break;

                case NodeTypes.Types.Valve:
                    properties["type"] = random.Next(0, 5) switch
                    {
                        0 => "Ball",
                        1 => "Butterfly",
                        2 => "Gate",
                        3 => "Globe",
                        4 => "Control",
                        _ => "Control"
                    };
                    properties["size"] = random.Next(2, 24);  // 2-24 inches
                    properties["cv"] = Math.Round(random.NextDouble() * 1000 + 100, 2);  // Flow coefficient
                    properties["material"] = random.Next(0, 3) switch
                    {
                        0 => "Stainless Steel",
                        1 => "Cast Iron",
                        2 => "Carbon Steel",
                        _ => "Stainless Steel"
                    };
                    properties["actuator_type"] = random.Next(0, 3) switch
                    {
                        0 => "Pneumatic",
                        1 => "Electric",
                        2 => "Hydraulic",
                        _ => "Pneumatic"
                    };
                    properties["fail_position"] = random.Next(0, 3) switch
                    {
                        0 => "Open",
                        1 => "Closed",
                        2 => "Last Position",
                        _ => "Closed"
                    };
                    properties["leakage_class"] = $"Class {random.Next(1, 6)}";
                    properties["current_position"] = Math.Round(random.NextDouble() * 100, 1);  // 0-100%
                    break;

                default:
                    // Add generic properties for any other node types
                    properties["asset_tag"] = $"TAG-{random.Next(1000, 9999)}";
                    properties["criticality"] = random.Next(1, 5);
                    properties["condition_score"] = Math.Round(random.NextDouble() * 4 + 1, 1);  // 1-5
                    properties["replacement_cost"] = random.Next(5000, 50000);
                    properties["expected_lifetime_years"] = random.Next(10, 25);
                    break;
            }

            return properties;
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
                Properties = GenerateEdgeProperties(type)
            };

            // Store the edge in Cosmos DB using graphId as partition key
            return await _cosmosService.CreateEdgeAsync(edge);
        }

        private Dictionary<string, object> GenerateEdgeProperties(string edgeType)
        {
            var properties = new Dictionary<string, object>();
            var random = new Random();

            // Add common properties for all edge types
            properties["created_by"] = "PlantGraphStrategy2";
            properties["status"] = random.Next(0, 10) > 8 ? "maintenance" : "operational";

            // Add specific properties based on edge type
            switch (edgeType)
            {
                case EdgeType.Types.FlowTo:
                    properties["flow_rate"] = Math.Round(random.NextDouble() * 100, 2);
                    properties["fluid_type"] = random.Next(0, 3) switch
                    {
                        0 => "water",
                        1 => "steam",
                        2 => "chemical",
                        _ => "water"
                    };
                    properties["pressure"] = Math.Round(random.NextDouble() * 30 + 5, 2);
                    break;

                case EdgeType.Types.PumpsTo:
                    properties["pump_power"] = Math.Round(random.NextDouble() * 500 + 100, 2);
                    properties["max_flow_rate"] = Math.Round(random.NextDouble() * 200 + 50, 2);
                    properties["efficiency"] = Math.Round(random.NextDouble() * 30 + 70, 2); // 70-100%
                    break;

                case EdgeType.Types.Monitors:
                    properties["sensor_type"] = random.Next(0, 4) switch
                    {
                        0 => "temperature",
                        1 => "pressure",
                        2 => "flow",
                        3 => "level",
                        _ => "temperature"
                    };
                    properties["reading_interval_ms"] = random.Next(100, 5000);
                    properties["accuracy"] = Math.Round(random.NextDouble() * 0.5 + 99, 2); // 99-99.5%
                    break;

                case EdgeType.Types.Controls:
                    properties["control_method"] = random.Next(0, 3) switch
                    {
                        0 => "direct",
                        1 => "pid",
                        2 => "fuzzy_logic",
                        _ => "direct"
                    };
                    properties["response_time_ms"] = random.Next(10, 500);
                    properties["priority"] = random.Next(1, 5);
                    break;

                case EdgeType.Types.ConnectedTo:
                    properties["connection_type"] = random.Next(0, 3) switch
                    {
                        0 => "digital",
                        1 => "analog",
                        2 => "mechanical",
                        _ => "digital"
                    };
                    properties["distance"] = Math.Round(random.NextDouble() * 20, 2);
                    properties["last_inspection"] = DateTime.UtcNow.AddDays(-random.Next(0, 365));
                    break;

                case EdgeType.Types.Heats:
                    properties["heat_transfer_rate"] = Math.Round(random.NextDouble() * 1000 + 100, 2);
                    properties["max_temperature"] = random.Next(100, 800);
                    properties["thermal_efficiency"] = Math.Round(random.NextDouble() * 20 + 75, 2); // 75-95%
                    break;

                case EdgeType.Types.Cools:
                    properties["cooling_capacity"] = Math.Round(random.NextDouble() * 500 + 50, 2);
                    properties["min_temperature"] = random.Next(-20, 15);
                    properties["coolant_type"] = random.Next(0, 3) switch
                    {
                        0 => "water",
                        1 => "glycol",
                        2 => "refrigerant",
                        _ => "water"
                    };
                    break;

                // Add default properties for edge types not specifically handled
                default:
                    properties["installed_date"] = DateTime.UtcNow.AddDays(-random.Next(1, 1000)).ToString("yyyy-MM-dd");
                    properties["maintenance_interval_days"] = random.Next(30, 365);
                    properties["reliability_score"] = Math.Round(random.NextDouble() * 2 + 8, 1); // 8.0-10.0
                    break;
            }

            return properties;
        }

    }
}