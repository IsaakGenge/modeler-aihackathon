using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ModelerAPI.ApiService.Models;
using System;
using System.Collections.Generic;
using System.Reflection;

namespace ModelerAPI.ApiService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TypesController : ControllerBase
    {
        /// <summary>
        /// Gets all available node types in the system
        /// </summary>
        /// <returns>A list of node types</returns>
        [HttpGet("nodes")]
        public ActionResult<IEnumerable<NodeType>> GetNodeTypes()
        {
            var nodeTypes = new List<NodeType>();

            // Get all constant values from NodeType.Types
            var nodeTypeFields = typeof(NodeType.Types).GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy);

            foreach (var field in nodeTypeFields)
            {
                if (field.IsLiteral && !field.IsInitOnly)
                {
                    string typeName = field.GetValue(null)?.ToString();
                    var nodeType = new NodeType
                    {
                        Id = Guid.NewGuid().ToString(),
                        Name = typeName,
                        Description = $"Node type: {typeName}",
                        Category = GetCategoryFromFieldName(field.Name),
                        StyleProperties = NodeType.GetStylePropertiesForType(typeName)
                    };

                    nodeTypes.Add(nodeType);
                }
            }

            return Ok(nodeTypes);
        }

        /// <summary>
        /// Gets all available edge types in the system
        /// </summary>
        /// <returns>A list of edge types</returns>
        [HttpGet("edges")]
        public ActionResult<IEnumerable<EdgeType>> GetEdgeTypes()
        {
            var edgeTypes = new List<EdgeType>();

            // Get all constant values from EdgeType.Types
            var edgeTypeFields = typeof(EdgeType.Types).GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy);

            foreach (var field in edgeTypeFields)
            {
                if (field.IsLiteral && !field.IsInitOnly)
                {
                    string typeName = field.GetValue(null)?.ToString();
                    edgeTypes.Add(new EdgeType
                    {
                        Id = Guid.NewGuid().ToString(),
                        Name = typeName,
                        Description = $"Edge type: {typeName}",
                        Category = GetCategoryFromFieldName(field.Name),
                        IsDirected = true,
                        StyleProperties = EdgeType.GetStylePropertiesForType(typeName)
                    });
                }
            }

            return Ok(edgeTypes);
        }

      

        /// <summary>
        /// Helper method to determine category based on type name patterns
        /// </summary>
         public static string GetCategoryFromFieldName(string fieldName)
        {
            // Plant-related types
            if (fieldName is "Boiler" or "Pump" or "Furnace" or "HeatExchanger" or "Valve" or
                "Tank" or "Pipe" or "Sensor" or "ControlSystem" or "Turbine" or "Condenser" or
                "Filter" or "Compressor" or "CoolingTower" or "FlowTo" or "ConnectedTo" or
                "ControlledBy" or "Controls" or "Monitors" or "Heats" or "Cools" or "Pressurizes" or
                "Filters" or "Supplies" or "ReceivesFrom" or "PumpsTo" or "RegulatesFlowTo")
            {
                return "Plant";
            }
            // Random graph types
            else if (fieldName is "Person" or "Place" or "Thing" or "Concept" or
                     "Related" or "Belongs" or "Contains" or "Depends")
            {
                return "Random";
            }
            // Star graph types
            else if (fieldName is "Hub" or "Satellite")
            {
                return "Star";
            }
            // Chain graph types
            else if (fieldName is "Chain" or "Next")
            {
                return "Chain";
            }

            return "Other";
        }

}
}
