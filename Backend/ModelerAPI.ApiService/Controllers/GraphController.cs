using Microsoft.AspNetCore.Mvc;
using ModelerAPI.ApiService.Models;

namespace ModelerAPI.ApiService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GraphController : ControllerBase
    {
        private readonly ICosmosService _cosmosService;
        private readonly ILogger<GraphController> _logger;

        public GraphController(ICosmosService cosmosService, ILogger<GraphController> logger)
        {
            _cosmosService = cosmosService ?? throw new ArgumentNullException(nameof(cosmosService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets all graphs
        /// </summary>
        /// <returns>A list of all graph objects</returns>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<Graph>))]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAllGraphsAsync()
        {
            try
            {
                _logger.LogInformation("Getting all graphs");

                var query = "SELECT * FROM c WHERE c.documentType = 'Graph'";
                var graphs = await _cosmosService.QueryItemsAsync<Graph>(query);

                if (graphs == null || !graphs.Any())
                {
                    _logger.LogWarning("No graphs found");
                    return NotFound("No graphs found");
                }

                return Ok(graphs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all graphs");
                return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while retrieving graphs");
            }
        }

        /// <summary>
        /// Gets a specific graph by ID
        /// </summary>
        /// <param name="id">The unique identifier of the graph</param>
        /// <returns>The requested graph object</returns>
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(Graph))]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetGraphByIdAsync(string id)
        {
            try
            {
                _logger.LogInformation("Getting graph with ID: {Id}", id);

                // Use the ID as both the ID and partition key
                var graph = await _cosmosService.GetItemAsync<Graph>(id, id);

                if (graph == null)
                {
                    _logger.LogWarning("Graph with ID: {Id} not found", id);
                    return NotFound($"Graph with ID: {id} not found");
                }

                return Ok(graph);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting graph with ID: {Id}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while retrieving the graph");
            }
        }

        /// <summary>
        /// Creates a new graph
        /// </summary>
        /// <param name="graph">The graph object to create</param>
        /// <returns>The created graph object with its assigned ID</returns>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created, Type = typeof(Graph))]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateGraphAsync([FromBody] Graph graph)
        {
            try
            {
                if (graph == null)
                {
                    return BadRequest("Graph data is required");
                }

                if (string.IsNullOrWhiteSpace(graph.Name))
                {
                    return BadRequest("Graph name is required");
                }

                _logger.LogInformation("Creating new graph with name: {Name}", graph.Name);

                // Ensure we have a new ID and timestamps
                graph.Id = Guid.NewGuid().ToString();
                graph.CreatedAt = DateTime.UtcNow;
                graph.UpdatedAt = DateTime.UtcNow;
                graph.DocumentType = "Graph";

                // Explicitly set the partition key field
                graph.PartitionKey = graph.Id;  // Using ID as the partition key value

                // Create the item, passing both the object and the partition key value
                try
                {
                    var createdGraph = await _cosmosService.CreateItemAsync(graph, graph.Id);

                    // Log successful creation for debugging
                    _logger.LogInformation("Successfully created graph: {GraphId}, {GraphName}",
                        createdGraph.Id, createdGraph.Name);

                    // Construct the location URI manually to ensure it's correct
                    var locationUri = $"{Request.Scheme}://{Request.Host}/api/Graph/{createdGraph.Id}";

                    // Return 201 Created with the created resource and location header
                    return Created(locationUri, createdGraph);
                }
                catch (Exception innerEx)
                {
                    _logger.LogError(innerEx, "Error in Cosmos Service while creating graph: {Message}", innerEx.Message);
                    throw; // Re-throw to be caught by outer exception handler
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating graph with name: {Name}. Message: {Message}",
                    graph?.Name, ex.Message);

                // Return both the error message and any inner exception messages
                string errorDetails = ex.Message;
                if (ex.InnerException != null)
                {
                    errorDetails += $" Inner error: {ex.InnerException.Message}";
                }

                return StatusCode(StatusCodes.Status500InternalServerError,
                    $"An error occurred while creating the graph: {errorDetails}");
            }
        }

        /// <summary>
        /// Updates an existing graph
        /// </summary>
        /// <param name="id">The unique identifier of the graph to update</param>
        /// <param name="graphUpdate">The updated graph data</param>
        /// <returns>The updated graph object</returns>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(Graph))]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UpdateGraphAsync(string id, [FromBody] Graph graphUpdate)
        {
            try
            {
                if (graphUpdate == null)
                {
                    return BadRequest("Graph data is required");
                }

                if (string.IsNullOrWhiteSpace(graphUpdate.Name))
                {
                    return BadRequest("Graph name is required");
                }

                _logger.LogInformation("Updating graph with ID: {Id}", id);

                // Check if graph exists
                var existingGraph = await _cosmosService.GetItemAsync<Graph>(id, id);

                if (existingGraph == null)
                {
                    _logger.LogWarning("Graph with ID: {Id} not found for update", id);
                    return NotFound($"Graph with ID: {id} not found");
                }

                // Update properties
                existingGraph.Name = graphUpdate.Name;
                existingGraph.UpdatedAt = DateTime.UtcNow;

                // Save the updated graph
                var updatedGraph = await _cosmosService.UpsertItemAsync<Graph>(existingGraph, id);

                return Ok(updatedGraph);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating graph with ID: {Id}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while updating the graph");
            }
        }

        /// <summary>
        /// Deletes a graph and all its associated nodes and edges
        /// </summary>
        /// <param name="id">The unique identifier of the graph to delete</param>
        /// <returns>No content on successful deletion</returns>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteGraphAsync(string id)
        {
            try
            {
                _logger.LogInformation("Deleting graph with ID: {Id}", id);

                // Check if graph exists
                var existingGraph = await _cosmosService.GetItemAsync<Graph>(id, id);

                if (existingGraph == null)
                {
                    _logger.LogWarning("Graph with ID: {Id} not found for deletion", id);
                    return NotFound($"Graph with ID: {id} not found");
                }

                // Step 1: Get all nodes associated with this graph
                _logger.LogInformation("Retrieving nodes associated with graph: {Id}", id);
                var nodes = await _cosmosService.GetNodes(id);
                _logger.LogInformation("Found {Count} nodes to delete", nodes.Count);

                // Step 2: Get all edges associated with this graph
                _logger.LogInformation("Retrieving edges associated with graph: {Id}", id);
                var edges = await _cosmosService.GetEdges(id);
                _logger.LogInformation("Found {Count} edges to delete", edges.Count);

                // Step 3: Delete all edges first (to maintain referential integrity)
                _logger.LogInformation("Deleting {Count} edges", edges.Count);
                foreach (var edge in edges)
                {
                    if (!string.IsNullOrEmpty(edge.Id))
                    {
                        await _cosmosService.DeleteEdgeAsync(edge.Id);
                    }
                }

                // Step 4: Delete all nodes
                _logger.LogInformation("Deleting {Count} nodes", nodes.Count);
                foreach (var node in nodes)
                {
                    if (!string.IsNullOrEmpty(node.Id))
                    {
                        await _cosmosService.DeleteNodeAsync(node.Id);
                    }
                }

                // Step 5: Finally, delete the graph itself
                _logger.LogInformation("Deleting graph: {Id}", id);
                await _cosmosService.DeleteItemAsync(id, id);

                _logger.LogInformation("Successfully deleted graph {Id} and all associated nodes and edges", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting graph with ID: {Id}", id);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    $"An error occurred while deleting the graph: {ex.Message}");
            }
        }
    }
}

