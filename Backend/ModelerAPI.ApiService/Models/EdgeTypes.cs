using System.ComponentModel.DataAnnotations;

namespace ModelerAPI.ApiService.Models
{
    /// <summary>
    /// Defines all available edge types in the system
    /// </summary>
    public class EdgeType
    {
        /// <summary>
        /// Static dictionary mapping edge types to their style properties
        /// </summary>
        private static readonly Dictionary<string, Dictionary<string, string>> EdgeStyleMappings;

        /// <summary>
        /// Static constructor to initialize the style mappings
        /// </summary>
        static EdgeType()
        {
            EdgeStyleMappings = new Dictionary<string, Dictionary<string, string>>
            {
                // Plant graph edge types
                {
                    Types.FlowTo, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#2196F3",  // Blue
                        ["lineStyle"] = "solid",
                        ["width"] = "3",
                        ["targetArrowShape"] = "triangle"
                    }
                },
                {
                    Types.ConnectedTo, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#4CAF50",  // Green
                        ["lineStyle"] = "solid",
                        ["width"] = "2",
                        ["targetArrowShape"] = "none"
                    }
                },
                {
                    Types.ControlledBy, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#F44336",  // Red
                        ["lineStyle"] = "dashed",
                        ["width"] = "2",
                        ["targetArrowShape"] = "triangle"
                    }
                },
                {
                    Types.Controls, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#F44336",  // Red
                        ["lineStyle"] = "dashed",
                        ["width"] = "2",
                        ["targetArrowShape"] = "triangle"
                    }
                },
                {
                    Types.Monitors, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#9C27B0",  // Purple
                        ["lineStyle"] = "dotted",
                        ["width"] = "2",
                        ["targetArrowShape"] = "diamond"
                    }
                },
                {
                    Types.Heats, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#FF5722",  // Deep Orange
                        ["lineStyle"] = "solid",
                        ["width"] = "2",
                        ["targetArrowShape"] = "triangle"
                    }
                },
                {
                    Types.Cools, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#00BCD4",  // Cyan
                        ["lineStyle"] = "solid",
                        ["width"] = "2",
                        ["targetArrowShape"] = "triangle"
                    }
                },
                {
                    Types.Pressurizes, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#FF9800",  // Orange
                        ["lineStyle"] = "solid",
                        ["width"] = "2",
                        ["targetArrowShape"] = "triangle"
                    }
                },
                {
                    Types.Filters, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#3F51B5",  // Indigo
                        ["lineStyle"] = "solid",
                        ["width"] = "2",
                        ["targetArrowShape"] = "triangle"
                    }
                },
                {
                    Types.Supplies, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#009688",  // Teal
                        ["lineStyle"] = "solid",
                        ["width"] = "2",
                        ["targetArrowShape"] = "triangle"
                    }
                },
                {
                    Types.ReceivesFrom, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#8BC34A",  // Light Green
                        ["lineStyle"] = "solid",
                        ["width"] = "2",
                        ["targetArrowShape"] = "triangle"
                    }
                },
                {
                    Types.PumpsTo, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#03A9F4",  // Light Blue
                        ["lineStyle"] = "solid",
                        ["width"] = "3",
                        ["targetArrowShape"] = "triangle"
                    }
                },
                {
                    Types.RegulatesFlowTo, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#673AB7",  // Deep Purple
                        ["lineStyle"] = "solid",
                        ["width"] = "2",
                        ["targetArrowShape"] = "triangle"
                    }
                },

                // Random graph edge types
                {
                    Types.Related, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#607D8B",  // Blue Grey
                        ["lineStyle"] = "solid",
                        ["width"] = "1",
                        ["targetArrowShape"] = "none"
                    }
                },
                {
                    Types.Belongs, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#795548",  // Brown
                        ["lineStyle"] = "solid",
                        ["width"] = "1",
                        ["targetArrowShape"] = "triangle"
                    }
                },
                {
                    Types.Contains, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#9E9E9E",  // Grey
                        ["lineStyle"] = "solid",
                        ["width"] = "1",
                        ["targetArrowShape"] = "circle"
                    }
                },
                {
                    Types.Depends, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#E91E63",  // Pink
                        ["lineStyle"] = "dashed",
                        ["width"] = "1",
                        ["targetArrowShape"] = "triangle"
                    }
                },

                // Chain graph edge types
                {
                    Types.Next, new Dictionary<string, string>
                    {
                        ["lineColor"] = "#000000",  // Black
                        ["lineStyle"] = "solid",
                        ["width"] = "2",
                        ["targetArrowShape"] = "triangle"
                    }
                }
            };
        }

        /// <summary>
        /// Gets the style properties for a specific edge type
        /// </summary>
        /// <param name="typeName">The edge type name</param>
        /// <returns>A dictionary of style properties</returns>
        public static Dictionary<string, string> GetStylePropertiesForType(string typeName)
        {
            Dictionary<string, string> styleProperties;

            if (EdgeStyleMappings.TryGetValue(typeName, out var mappedProperties))
            {
                styleProperties = new Dictionary<string, string>(mappedProperties);
            }
            else
            {
                // Default edge type
                styleProperties = new Dictionary<string, string>
                {
                    ["lineColor"] = "#757575",  // Grey
                    ["lineStyle"] = "solid",
                    ["width"] = "1",
                    ["targetArrowShape"] = "triangle"
                };
            }

            // Add common properties that apply to all edges
            styleProperties["curveStyle"] = "bezier";  // can be 'bezier', 'straight', 'unbundled-bezier', 'segments'
            styleProperties["lineOpacity"] = "0.8";

            return styleProperties;
        }

        /// <summary>
        /// Unique identifier for the edge type
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Name of the edge type
        /// </summary>
        [Required]
        public string Name { get; set; }

        /// <summary>
        /// Description of the edge type
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// Category or group this edge type belongs to
        /// </summary>
        public string Category { get; set; }

        /// <summary>
        /// Default style properties for visualization
        /// </summary>
        public Dictionary<string, string> StyleProperties { get; set; } = new Dictionary<string, string>();

        /// <summary>
        /// Whether this edge type is directed or undirected
        /// </summary>
        public bool IsDirected { get; set; } = true;

        /// <summary>
        /// When the edge type was created
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the edge type was last updated
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Static predefined edge types from various generation strategies
        /// </summary>
        public static class Types
        {
            // Plant graph edge types
            public const string FlowTo = "FlowTo";
            public const string ConnectedTo = "ConnectedTo";
            public const string ControlledBy = "ControlledBy";
            public const string Controls = "Controls";
            public const string Monitors = "Monitors";
            public const string Heats = "Heats";
            public const string Cools = "Cools";
            public const string Pressurizes = "Pressurizes";
            public const string Filters = "Filters";
            public const string Supplies = "Supplies";
            public const string ReceivesFrom = "ReceivesFrom";
            public const string PumpsTo = "PumpsTo";
            public const string RegulatesFlowTo = "RegulatesFlowTo";

            // Random graph edge types
            public const string Related = "Related";
            public const string Belongs = "Belongs";
            public const string Contains = "Contains";
            public const string Depends = "Depends";

            // Chain graph edge types
            public const string Next = "Next";
        }
    }
}
