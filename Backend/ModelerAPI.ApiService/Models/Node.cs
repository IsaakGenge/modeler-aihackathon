using System.Text.Json.Serialization;

namespace ModelerAPI.ApiService.Models
{
    /// <summary>
    /// Represents a node in the graph database
    /// </summary>
    public class Node
    {
        /// <summary>
        /// Unique identifier for the node
        /// </summary>
        public string? Id { get; set; }

        /// <summary>
        /// Name of the node
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Type or category of the node
        /// </summary>
        public string NodeType { get; set; } = "default";

        /// <summary>
        /// Unique identifier for the graph
        /// </summary>        
        public string GraphId { get; set; }

        /// <summary>
        /// Partition key for Cosmos DB, maps to GraphId
        /// </summary>       
        public string pKey { get; set; }
        /// <summary>
        /// When the node was created
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// X position of the node in the graph visualization
        /// </summary>
        public double? PositionX { get; set; }

        /// <summary>
        /// Y position of the node in the graph visualization
        /// </summary>
        public double? PositionY { get; set; }

        /// <summary>
        /// Custom properties for the node that can be stored as key-value pairs
        /// All values should be JSON parsable
        /// </summary>
        public Dictionary<string, object> Properties { get; set; } = new Dictionary<string, object>();
    }

    public class NodePositionsDto
    {
        public string GraphId { get; set; }
        public Dictionary<string, Position> Positions { get; set; }
    }

    public class Position
    {
        public double X { get; set; }
        public double Y { get; set; }
    }
}
