using System;

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
        /// When the node was created
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
