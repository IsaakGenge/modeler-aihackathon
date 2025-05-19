using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Cosmos;
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
        public async Task<IActionResult> GetNodes()
        {          
            if (CosmosService == null )
            {
                return NotFound();
            }
            var nodes = await CosmosService.GetNodes();
            if (nodes == null || nodes.Count() == 0)
            {
                return NotFound();
            }
            else
            {
                return Ok(nodes);
            }

        }
        // POST: api/node
        [HttpPost]
        public async Task<IActionResult> CreateNode([FromBody] Node node)
        {
            // Store in Cosmos DB
            await CosmosService.CreateNodeAsync(node as Node);
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
        public async Task<IActionResult> DeleteNode(string id)
        {
            if (string.IsNullOrEmpty(id))
            {
                return BadRequest("Node ID is required");
            }

            var result = await CosmosService.DeleteNodeAsync(id);
            if (result)
            {
                return NoContent();
            }
            else
            {
                return NotFound($"Node with ID {id} could not be deleted or does not exist");
            }
        }

    }
}
