namespace ModelerAPI.ApiService.Models
{
    /// <summary>
    /// Represents an edge (connection) in the graph database
    /// </summary>
    public class Edge
    {
        /// <summary>
        /// Unique identifier for the edge
        /// </summary>
        public string? Id { get; set; }

        /// <summary>
        /// Source node ID (outgoing vertex)
        /// </summary>
        public string Source { get; set; }

        /// <summary>
        /// Target node ID (incoming vertex)
        /// </summary>
        public string Target { get; set; }

        /// <summary>
        /// Type or category of the edge
        /// </summary>
        public string EdgeType { get; set; } = "default";

        /// <summary>
        /// Unique identifier for the graph
        /// </summary>
        public string GraphId { get; set; }

        /// <summary>
        /// When the edge was created
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Custom properties for the edge that can be stored as key-value pairs
        /// All values should be JSON parsable
        /// </summary>
        public Dictionary<string, object> Properties { get; set; } = new Dictionary<string, object>();
    }
}
