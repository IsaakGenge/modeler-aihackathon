using Microsoft.AspNetCore.Mvc;
using ModelerAPI.ApiService.Services.Export;
using ModelerAPI.ApiService.Services.Import;
using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace ModelerAPI.ApiService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ImportExportController : ControllerBase
    {
        private readonly IExportService _exportService;
        private readonly IImportService _importService;
        private readonly ILogger<ImportExportController> _logger;

        public ImportExportController(
            IExportService exportService,
            IImportService importService,
            ILogger<ImportExportController> logger)
        {
            _exportService = exportService ?? throw new ArgumentNullException(nameof(exportService));
            _importService = importService ?? throw new ArgumentNullException(nameof(importService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Exports a graph and all its nodes and edges as JSON
        /// </summary>
        /// <param name="graphId">ID of the graph to export</param>
        /// <returns>JSON representation of the graph, its nodes, and edges</returns>
        [HttpGet("export/{graphId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportGraph(string graphId)
        {
            try
            {
                _logger.LogInformation("Exporting graph with ID: {Id}", graphId);

                if (string.IsNullOrEmpty(graphId))
                {
                    return BadRequest("Graph ID is required");
                }

                var jsonResult = await _exportService.ExportGraphAsJsonAsync(graphId);

                // Set content type and suggested filename
                Response.Headers.Add("Content-Disposition", $"attachment; filename=graph-{graphId}-export.json");

                return Content(jsonResult, "application/json");
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Graph not found for export: {Id}", graphId);
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting graph with ID: {Id}", graphId);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    $"An error occurred while exporting the graph: {ex.Message}");
            }
        }

        /// <summary>
        /// Gets the structured export data for a graph
        /// </summary>
        /// <param name="graphId">ID of the graph to export</param>
        /// <returns>The graph export data including graph, nodes, and edges</returns>
        [HttpGet("export-data/{graphId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetExportData(string graphId)
        {
            try
            {
                _logger.LogInformation("Getting export data for graph with ID: {Id}", graphId);

                if (string.IsNullOrEmpty(graphId))
                {
                    return BadRequest("Graph ID is required");
                }

                var exportData = await _exportService.ExportGraphAsync(graphId);
                return Ok(exportData);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Graph not found for export data: {Id}", graphId);
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting export data for graph with ID: {Id}", graphId);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    $"An error occurred while getting the export data: {ex.Message}");
            }
        }

        /// <summary>
        /// Imports a graph from a JSON file
        /// </summary>
        /// <returns>Information about the imported graph</returns>
        [HttpPost("import")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ImportGraph([FromForm] ImportGraphRequest request)
        {
            try
            {
                _logger.LogInformation("Importing graph from uploaded file");

                if (request.GraphFile == null || request.GraphFile.Length == 0)
                {
                    return BadRequest("No file uploaded or file is empty");
                }

                // Read the file content
                string jsonData;
                using (var reader = new StreamReader(request.GraphFile.OpenReadStream(), Encoding.UTF8))
                {
                    jsonData = await reader.ReadToEndAsync();
                }

                // Import the graph
                var newGraphId = await _importService.ImportGraphFromJsonAsync(jsonData, request.NewGraphName);

                // Return success with location header pointing to the new graph
                var locationUri = $"{Request.Scheme}://{Request.Host}/api/Graph/{newGraphId}";
                return Created(locationUri, new { GraphId = newGraphId, Message = "Graph imported successfully" });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid import data: {Message}", ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing graph");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    $"An error occurred while importing the graph: {ex.Message}");
            }
        }

        /// <summary>
        /// Imports a graph from a JSON string in the request body
        /// </summary>
        /// <returns>Information about the imported graph</returns>
        [HttpPost("import-json")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ImportGraphFromJson([FromBody] ImportGraphJsonRequest request)
        {
            try
            {
                _logger.LogInformation("Importing graph from JSON data");

                if (string.IsNullOrEmpty(request.JsonData))
                {
                    return BadRequest("JSON data is required");
                }

                // Import the graph
                var newGraphId = await _importService.ImportGraphFromJsonAsync(request.JsonData, request.NewGraphName);

                // Return success with location header pointing to the new graph
                var locationUri = $"{Request.Scheme}://{Request.Host}/api/Graph/{newGraphId}";
                return Created(locationUri, new { GraphId = newGraphId, Message = "Graph imported successfully" });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid import data: {Message}", ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing graph from JSON");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    $"An error occurred while importing the graph: {ex.Message}");
            }
        }
    }

    public class ImportGraphRequest
    {
        /// <summary>
        /// The JSON file containing the graph export data
        /// </summary>
        public IFormFile GraphFile { get; set; }

        /// <summary>
        /// Optional new name for the imported graph
        /// </summary>
        public string NewGraphName { get; set; }
    }

    public class ImportGraphJsonRequest
    {
        /// <summary>
        /// The JSON string containing the graph export data
        /// </summary>
        public string JsonData { get; set; }

        /// <summary>
        /// Optional new name for the imported graph
        /// </summary>
        public string NewGraphName { get; set; }
    }
}
