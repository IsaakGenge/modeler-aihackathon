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
