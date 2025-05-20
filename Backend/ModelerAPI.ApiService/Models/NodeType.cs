using System.ComponentModel.DataAnnotations;

namespace ModelerAPI.ApiService.Models
{
    /// <summary>
    /// Defines all available node types in the system
    /// </summary>
    public class NodeType
    {
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
