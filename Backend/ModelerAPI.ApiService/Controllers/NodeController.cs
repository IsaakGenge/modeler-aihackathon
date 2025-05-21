using Microsoft.AspNetCore.Mvc;
using ModelerAPI.ApiService.Models;
using ModelerAPI.ApiService.Services.Cosmos;

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
        public async Task<IActionResult> GetNodes([FromQuery] string graphId)
        {
            if (CosmosService == null)
            {
                return NotFound();
            }

            try
            {
                // GraphId is optional but will be used for filtering if provided
                var nodes = await CosmosService.GetNodes(graphId);

                if (nodes == null || !nodes.Any())
                {
                    if (!string.IsNullOrEmpty(graphId))
                    {
                        return NotFound($"No nodes found for graph ID: {graphId}");
                    }
                    return NotFound("No nodes found");
                }

                return Ok(nodes);
            }
            catch (Exception ex)
            {               
                return StatusCode(500, "An error occurred while retrieving nodes");
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
        public async Task<IActionResult> UpdateNode(string id, [FromBody] Node node)
        {
            try
            {
                if (id != node.Id)
                {
                    return BadRequest("ID in URL does not match ID in the request body");
                }

                if (string.IsNullOrEmpty(node.Id))
                {
                    return BadRequest("Node ID is required");
                }

                // Update the node using the CosmosService
                var updatedNode = await CosmosService.UpdateNodeAsync(node);

                return Ok(updatedNode);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred while updating the node: {ex.Message}");
            }
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

        [HttpPost("positions")]
        public async Task<IActionResult> SavePositions([FromBody] NodePositionsDto request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.GraphId))
                {
                    return BadRequest("Graph ID is required");
                }

                if (request.Positions == null || !request.Positions.Any())
                {
                    return BadRequest("No positions provided");
                }

                // Convert positions to the tuple format expected by the service
                var positionDictionary = request.Positions.ToDictionary(
                    p => p.Key,
                    p => (p.Value.X, p.Value.Y)
                );

                var result = await CosmosService.BatchUpdateNodePositionsAsync(positionDictionary);

                if (result)
                {
                    return Ok(new { success = true, message = "Node positions updated successfully" });
                }
                else
                {
                    return StatusCode(500, new { success = false, message = "Failed to update node positions" });
                }
            }
            catch (Exception ex)
            {                
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    

}
