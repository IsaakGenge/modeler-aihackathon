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
        public async Task<IActionResult> GetEdges()
        {
            if (_cosmosService == null)
            {
                return NotFound();
            }

            var edges = await _cosmosService.GetEdges();
            if (edges == null || !edges.Any())
            {
                return NotFound();
            }

            return Ok(edges);
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
        public IActionResult DeleteEdge(string id)
        {
            // Logic to delete an edge - to be implemented
            return NoContent();
        }
    }
}
