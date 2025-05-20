using Newtonsoft.Json;

namespace ModelerAPI.ApiService.Models
{
    public class Graph
        
    {
        /// <summary>
        /// The partition key for the graph, used for Cosmos DB
        /// </summary>
        [JsonProperty(PropertyName = "pkey")]
        public string PartitionKey { get; set; }
        /// <summary>
        /// The unique identifier for the graph
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        /// <summary>
        /// The name of the graph
        /// </summary>
        [JsonProperty(PropertyName = "name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// The timestamp when the graph was created
        /// </summary>
        [JsonProperty(PropertyName = "createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// The timestamp when the graph was last updated
        /// </summary>
        [JsonProperty(PropertyName = "updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// The type of document, used for querying in Cosmos DB
        /// </summary>
        [JsonProperty(PropertyName = "documentType")]
        public string DocumentType { get; set; } = "Graph";

        /// <summary>
        /// Creates a new Graph with default values
        /// </summary>
        public Graph()
        {
            Id = Guid.NewGuid().ToString();
            PartitionKey = Id; // Using ID as the partition key
        }

        /// <summary>
        /// Creates a new Graph with the specified name
        /// </summary>
        /// <param name="name">The name of the graph</param>
        public Graph(string name)
        {
            Name = name;
        }

        /// <summary>
        /// Creates a new Graph with the specified ID and name
        /// </summary>
        /// <param name="id">The unique identifier for the graph</param>
        /// <param name="name">The name of the graph</param>
        public Graph(string id, string name)
        {
            Id = id;
            Name = name;
        }

        /// <summary>
        /// Updates the timestamp when changes are made to the graph
        /// </summary>
        public void Touch()
        {
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Provides a string representation of the Graph
        /// </summary>
        public override string ToString()
        {
            return $"Graph [Id={Id}, Name={Name}]";
        }
    }
}
