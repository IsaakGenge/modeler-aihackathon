using Microsoft.AspNetCore.Mvc;
using ModelerAPI.ApiService.Models;
using ModelerAPI.ApiService.Services.Cosmos; // Fixed namespace

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
        public async Task<IActionResult> UpdateEdge(string id, [FromBody] Edge edge)
        {
            try
            {
                if (id != edge.Id)
                {
                    return BadRequest("ID in URL does not match ID in the request body");
                }

                if (string.IsNullOrEmpty(edge.Id))
                {
                    return BadRequest("Edge ID is required");
                }

                // Update the edge using the CosmosService
                var updatedEdge = await _cosmosService.UpdateEdgeAsync(edge);

                return Ok(updatedEdge);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred while updating the edge: {ex.Message}");
            }
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
