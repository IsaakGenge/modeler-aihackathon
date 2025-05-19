using Microsoft.AspNetCore.Mvc;
using ModelerAPI.ApiService.Models;
using ModelerAPI.ApiService.Services;

namespace ModelerAPI.ApiService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NodeController : ControllerBase
    {
        private ICosmosService CosmosService { get; set; }

        public NodeController(ICosmosService cosmosService)
        {
          CosmosService = cosmosService;
        }

        // GET: api/node
        [HttpGet]
        public IActionResult GetNodes()
        {
            // Logic to get nodes
            return Ok(new { message = "Get all nodes" });
        }
        // POST: api/node
        [HttpPost]
        public async Task<IActionResult> CreateNode([FromBody] Node node)
        {
            // Store in Cosmos DB
            await CosmosService.CreateNodeAsync(node);
            return CreatedAtAction(nameof(GetNodes), new { id = node.Id }, node);
        }
        // PUT: api/node/{id}
        [HttpPut("{id}")]
        public IActionResult UpdateNode(int id, [FromBody] object node)
        {
            // Logic to update a node
            return NoContent();
        }
        // DELETE: api/node/{id}
        [HttpDelete("{id}")]
        public IActionResult DeleteNode(int id)
        {
            // Logic to delete a node
            return NoContent();
        }
    }
}
