namespace ModelerAPI.ApiService.Models
{
    public class Edge
    {
        /// <summary>
        /// Unique identifier for the edge
        /// </summary>
        public string? Id { get; set; }
        /// <summary>
        /// Source node ID
        /// </summary>
        public string Source { get; set; }
        /// <summary>
        /// Target node ID
        /// </summary>
        public string Target { get; set; }
        /// <summary>
        /// Type or category of the edge
        /// </summary>
        public string EdgeType { get; set; } = "default";
        /// <summary>
        /// When the edge was created
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}