using Microsoft.AspNetCore.Mvc;
using ModelerAPI.ApiService.Models;
using ModelerAPI.ApiService.Services;

namespace ModelerAPI.ApiService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EdgeController : ControllerBase
    {
        private readonly ICosmosService _cosmosService;

        public EdgeController(ICosmosService cosmosService)
        {
            _cosmosService = cosmosService;
        }

        // GET: api/edge
        [HttpGet]
        // GET: api/edge
        [HttpGet]
        public async Task<IActionResult> GetEdges([FromQuery] string graphId)
        {
            if (_cosmosService == null)
            {
                return NotFound();
            }

            try
            {
                // GraphId is optional but will be used for filtering if provided
                var edges = await _cosmosService.GetEdges(graphId);

                if (edges == null || !edges.Any())
                {
                    if (!string.IsNullOrEmpty(graphId))
                    {
                        return NotFound($"No edges found for graph ID: {graphId}");
                    }
                    return NotFound("No edges found");
                }

                return Ok(edges);
            }
            catch (Exception ex)
            {                
                return StatusCode(500, "An error occurred while retrieving edges");
            }
        }


        // POST: api/edge
        [HttpPost]
        public async Task<IActionResult> CreateEdge([FromBody] Edge edge)
        {
            if (edge == null || string.IsNullOrEmpty(edge.Source) || string.IsNullOrEmpty(edge.Target))
            {
                return BadRequest("Edge must have valid source and target node IDs");
            }

            // Store in Cosmos DB
            var createdEdge = await _cosmosService.CreateEdgeAsync(edge);
            return CreatedAtAction(nameof(GetEdges), new { id = createdEdge.Id }, createdEdge);
        }

        // PUT: api/edge/{id}
        [HttpPut("{id}")]
        public IActionResult UpdateEdge(string id, [FromBody] Edge edge)
        {
            // Logic to update an edge - to be implemented
            return NoContent();
        }

        // DELETE: api/edge/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEdge(string id)
        {
            if (string.IsNullOrEmpty(id))
            {
                return BadRequest("Edge ID is required");
            }

            var result = await _cosmosService.DeleteEdgeAsync(id);
            if (result)
            {
                return NoContent();
            }
            else
            {
                return NotFound($"Edge with ID {id} could not be deleted or does not exist");
            }
        }
    }
}
