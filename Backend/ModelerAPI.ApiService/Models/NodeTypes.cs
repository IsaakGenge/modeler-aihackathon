using System.ComponentModel.DataAnnotations;

namespace ModelerAPI.ApiService.Models
{
    /// <summary>
    /// Defines all available node types in the system
    /// </summary>
    public class NodeTypes
    {
        /// <summary>
        /// Static dictionary mapping node types to their style properties
        /// </summary>
        private static readonly Dictionary<string, Dictionary<string, string>> NodeStyleMappings;

        /// <summary>
        /// Static constructor to initialize the style mappings
        /// </summary>
        static NodeTypes()
        {
            NodeStyleMappings = new Dictionary<string, Dictionary<string, string>>
            {
                // Random graph node types
                {
                    Types.Person, new Dictionary<string, string>
                    {
                        ["shape"] = "round-rectangle",
                        ["color"] = "#E91E63"  // Pink
                    }
                },
                {
                    Types.Place, new Dictionary<string, string>
                    {
                        ["shape"] = "triangle",
                        ["color"] = "#009688"  // Teal
                    }
                },
                {
                    Types.Thing, new Dictionary<string, string>
                    {
                        ["shape"] = "diamond",
                        ["color"] = "#FF9800"  // Orange
                    }
                },
                {
                    Types.Concept, new Dictionary<string, string>
                    {
                        ["shape"] = "hexagon",
                        ["color"] = "#3F51B5"  // Indigo
                    }
                },

                // Plant graph node types
                {
                    Types.Boiler, new Dictionary<string, string>
                    {
                        ["shape"] = "roundrectangle",
                        ["color"] = "#D32F2F"  // Red
                    }
                },
                {
                    Types.Pump, new Dictionary<string, string>
                    {
                        ["shape"] = "ellipse",
                        ["color"] = "#1976D2"  // Blue
                    }
                },
                {
                    Types.Furnace, new Dictionary<string, string>
                    {
                        ["shape"] = "pentagon",
                        ["color"] = "#FF5722"  // Deep Orange
                    }
                },
                {
                    Types.HeatExchanger, new Dictionary<string, string>
                    {
                        ["shape"] = "rectangle",
                        ["color"] = "#FFC107"  // Amber
                    }
                },
                {
                    Types.Valve, new Dictionary<string, string>
                    {
                        ["shape"] = "diamond",
                        ["color"] = "#4CAF50"  // Green
                    }
                },
                {
                    Types.Tank, new Dictionary<string, string>
                    {
                        ["shape"] = "barrel",
                        ["color"] = "#9C27B0"  // Purple
                    }
                },
                {
                    Types.Pipe, new Dictionary<string, string>
                    {
                        ["shape"] = "round-rectangle",
                        ["color"] = "#607D8B"  // Blue Grey
                    }
                },
                {
                    Types.Sensor, new Dictionary<string, string>
                    {
                        ["shape"] = "star",
                        ["color"] = "#00BCD4"  // Cyan
                    }
                },
                {
                    Types.ControlSystem, new Dictionary<string, string>
                    {
                        ["shape"] = "cut-rectangle",
                        ["color"] = "#673AB7"  // Deep Purple
                    }
                },
                {
                    Types.Turbine, new Dictionary<string, string>
                    {
                        ["shape"] = "vee",
                        ["color"] = "#795548"  // Brown
                    }
                },
                {
                    Types.Condenser, new Dictionary<string, string>
                    {
                        ["shape"] = "concave-hexagon",
                        ["color"] = "#03A9F4"  // Light Blue
                    }
                },
                {
                    Types.Filter, new Dictionary<string, string>
                    {
                        ["shape"] = "tag",
                        ["color"] = "#8BC34A"  // Light Green
                    }
                },
                {
                    Types.Compressor, new Dictionary<string, string>
                    {
                        ["shape"] = "octagon",
                        ["color"] = "#CDDC39"  // Lime
                    }
                },
                {
                    Types.CoolingTower, new Dictionary<string, string>
                    {
                        ["shape"] = "rhomboid",
                        ["color"] = "#9E9E9E"  // Grey
                    }
                },

                // Star graph node types
                {
                    Types.Hub, new Dictionary<string, string>
                    {
                        ["shape"] = "star",
                        ["color"] = "#FFC107"  // Amber
                    }
                },
                {
                    Types.Satellite, new Dictionary<string, string>
                    {
                        ["shape"] = "ellipse",
                        ["color"] = "#9C27B0"  // Purple
                    }
                },

                // Chain graph node types
                {
                    Types.Chain, new Dictionary<string, string>
                    {
                        ["shape"] = "round-rectangle",
                        ["color"] = "#607D8B"  // Blue Grey
                    }
                }
            };
        }


      

        /// <summary>
        /// Gets the style properties for a specific node type
        /// </summary>
        /// <param name="typeName">The node type name</param>
        /// <returns>A dictionary of style properties</returns>
        public static Dictionary<string, string> GetStylePropertiesForType(string typeName)
        {
            if (NodeStyleMappings.TryGetValue(typeName, out var styleProperties))
            {
                return styleProperties;
            }

            // Default style if no matching type found
            return new Dictionary<string, string>
            {
                ["shape"] = "ellipse",
                ["color"] = "#8A2BE2"  // BlueViolet (default)
            };
        }

        /// <summary>
        /// Unique identifier for the node type
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Name of the node type
        /// </summary>
        [Required]
        public string Name { get; set; }

        /// <summary>
        /// Description of the node type
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// Category or group this node type belongs to
        /// </summary>
        public string Category { get; set; }

        /// <summary>
        /// Icon or visual representation for this node type
        /// </summary>
        public string Icon { get; set; }

        /// <summary>
        /// Default style properties for visualization
        /// </summary>
        public Dictionary<string, string> StyleProperties { get; set; } = new Dictionary<string, string>();

        /// <summary>
        /// When the node type was created
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the node type was last updated
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Static predefined node types from various generation strategies
        /// </summary>
        public static class Types
        {
            // Plant graph node types
            public const string Boiler = "Boiler";
            public const string Pump = "Pump";
            public const string Furnace = "Furnace";
            public const string HeatExchanger = "HeatExchanger";
            public const string Valve = "Valve";
            public const string Tank = "Tank";
            public const string Pipe = "Pipe";
            public const string Sensor = "Sensor";
            public const string ControlSystem = "ControlSystem";
            public const string Turbine = "Turbine";
            public const string Condenser = "Condenser";
            public const string Filter = "Filter";
            public const string Compressor = "Compressor";
            public const string CoolingTower = "CoolingTower";

            // Random graph node types
            public const string Person = "Person";
            public const string Place = "Place";
            public const string Thing = "Thing";
            public const string Concept = "Concept";

            // Star graph node types
            public const string Hub = "Hub";
            public const string Satellite = "Satellite";

            // Chain graph node types
            public const string Chain = "Chain";
        }
    }    
}
