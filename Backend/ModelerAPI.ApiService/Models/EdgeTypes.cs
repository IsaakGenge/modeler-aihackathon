using System.ComponentModel.DataAnnotations;

namespace ModelerAPI.ApiService.Models
{

    /// <summary>
    /// Defines all available edge types in the system
    /// </summary>
    public class EdgeType
    {
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
