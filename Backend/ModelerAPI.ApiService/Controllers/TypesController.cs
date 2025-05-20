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
                        StyleProperties = GetVisualSettingsForNodeType(typeName)
                    };

                    nodeTypes.Add(nodeType);
                }
            }

            return Ok(nodeTypes);
        }

        private Dictionary<string, string> GetVisualSettingsForNodeType(string typeName)
        {
            // Define visual settings based on node type
            var styleProperties = new Dictionary<string, string>();

            switch (typeName)
            {
                case "Person":
                    styleProperties["shape"] = "round-rectangle";
                    styleProperties["color"] = "#E91E63";  // Pink
                    break;
                case "Place":
                    styleProperties["shape"] = "triangle";
                    styleProperties["color"] = "#009688";  // Teal
                    break;
                case "Thing":
                    styleProperties["shape"] = "diamond";
                    styleProperties["color"] = "#FF9800";  // Orange
                    break;
                case "Concept":
                    styleProperties["shape"] = "hexagon";
                    styleProperties["color"] = "#3F51B5";  // Indigo
                    break;

                // Plant graph node types with distinct visual appearances
                case "Boiler":
                    styleProperties["shape"] = "roundrectangle";
                    styleProperties["color"] = "#D32F2F";  // Red
                    break;
                case "Pump":
                    styleProperties["shape"] = "ellipse";
                    styleProperties["color"] = "#1976D2";  // Blue
                    break;
                case "Furnace":
                    styleProperties["shape"] = "pentagon";
                    styleProperties["color"] = "#FF5722";  // Deep Orange
                    break;
                case "HeatExchanger":
                    styleProperties["shape"] = "rectangle";
                    styleProperties["color"] = "#FFC107";  // Amber
                    break;
                case "Valve":
                    styleProperties["shape"] = "diamond";
                    styleProperties["color"] = "#4CAF50";  // Green
                    break;
                case "Tank":
                    styleProperties["shape"] = "barrel";
                    styleProperties["color"] = "#9C27B0";  // Purple
                    break;
                case "Pipe":
                    styleProperties["shape"] = "round-rectangle";
                    styleProperties["color"] = "#607D8B";  // Blue Grey
                    break;
                case "Sensor":
                    styleProperties["shape"] = "star";
                    styleProperties["color"] = "#00BCD4";  // Cyan
                    break;
                case "ControlSystem":
                    styleProperties["shape"] = "cut-rectangle";
                    styleProperties["color"] = "#673AB7";  // Deep Purple
                    break;
                case "Turbine":
                    styleProperties["shape"] = "vee";
                    styleProperties["color"] = "#795548";  // Brown
                    break;
                case "Condenser":
                    styleProperties["shape"] = "concave-hexagon";
                    styleProperties["color"] = "#03A9F4";  // Light Blue
                    break;
                case "Filter":
                    styleProperties["shape"] = "tag";
                    styleProperties["color"] = "#8BC34A";  // Light Green
                    break;
                case "Compressor":
                    styleProperties["shape"] = "octagon";
                    styleProperties["color"] = "#CDDC39";  // Lime
                    break;
                case "CoolingTower":
                    styleProperties["shape"] = "rhomboid";
                    styleProperties["color"] = "#9E9E9E";  // Grey
                    break;

                case "Hub":
                    styleProperties["shape"] = "star";
                    styleProperties["color"] = "#FFC107";  // Amber (for hub nodes)
                    break;
                case "Satellite":
                    styleProperties["shape"] = "ellipse";
                    styleProperties["color"] = "#9C27B0";  // Purple (for satellite nodes)
                    break;
                case "Chain":
                    styleProperties["shape"] = "round-rectangle";
                    styleProperties["color"] = "#607D8B";  // Blue Grey
                    break;
                default:
                    styleProperties["shape"] = "ellipse";
                    styleProperties["color"] = "#8A2BE2";  // BlueViolet (default)
                    break;
            }

            return styleProperties;
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
                        StyleProperties = GetVisualSettingsForEdgeType(typeName)
                    });
                }
            }

            return Ok(edgeTypes);
        }

        private Dictionary<string, string> GetVisualSettingsForEdgeType(string typeName)
        {
            var styleProperties = new Dictionary<string, string>();

            switch (typeName)
            {
                // Plant graph edge types
                case "FlowTo":
                    styleProperties["lineColor"] = "#2196F3";  // Blue
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "3";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;
                case "ConnectedTo":
                    styleProperties["lineColor"] = "#4CAF50";  // Green
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "2";
                    styleProperties["targetArrowShape"] = "none";
                    break;
                case "ControlledBy":
                    styleProperties["lineColor"] = "#F44336";  // Red
                    styleProperties["lineStyle"] = "dashed";
                    styleProperties["width"] = "2";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;
                case "Controls":
                    styleProperties["lineColor"] = "#F44336";  // Red
                    styleProperties["lineStyle"] = "dashed";
                    styleProperties["width"] = "2";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;
                case "Monitors":
                    styleProperties["lineColor"] = "#9C27B0";  // Purple
                    styleProperties["lineStyle"] = "dotted";
                    styleProperties["width"] = "2";
                    styleProperties["targetArrowShape"] = "diamond";
                    break;
                case "Heats":
                    styleProperties["lineColor"] = "#FF5722";  // Deep Orange
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "2";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;
                case "Cools":
                    styleProperties["lineColor"] = "#00BCD4";  // Cyan
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "2";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;
                case "Pressurizes":
                    styleProperties["lineColor"] = "#FF9800";  // Orange
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "2";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;
                case "Filters":
                    styleProperties["lineColor"] = "#3F51B5";  // Indigo
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "2";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;
                case "Supplies":
                    styleProperties["lineColor"] = "#009688";  // Teal
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "2";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;
                case "ReceivesFrom":
                    styleProperties["lineColor"] = "#8BC34A";  // Light Green
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "2";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;
                case "PumpsTo":
                    styleProperties["lineColor"] = "#03A9F4";  // Light Blue
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "3";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;
                case "RegulatesFlowTo":
                    styleProperties["lineColor"] = "#673AB7";  // Deep Purple
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "2";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;

                // Random graph edge types
                case "Related":
                    styleProperties["lineColor"] = "#607D8B";  // Blue Grey
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "1";
                    styleProperties["targetArrowShape"] = "none";
                    break;
                case "Belongs":
                    styleProperties["lineColor"] = "#795548";  // Brown
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "1";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;
                case "Contains":
                    styleProperties["lineColor"] = "#9E9E9E";  // Grey
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "1";
                    styleProperties["targetArrowShape"] = "circle";
                    break;
                case "Depends":
                    styleProperties["lineColor"] = "#E91E63";  // Pink
                    styleProperties["lineStyle"] = "dashed";
                    styleProperties["width"] = "1";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;

                // Chain graph edge types
                case "Next":
                    styleProperties["lineColor"] = "#000000";  // Black
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "2";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;

                // Default edge type
                default:
                    styleProperties["lineColor"] = "#757575";  // Grey
                    styleProperties["lineStyle"] = "solid";
                    styleProperties["width"] = "1";
                    styleProperties["targetArrowShape"] = "triangle";
                    break;
            }

            // Add common properties that apply to all edges
            styleProperties["curveStyle"] = "bezier";  // can be 'bezier', 'straight', 'unbundled-bezier', 'segments'
            styleProperties["lineOpacity"] = "0.8";

            return styleProperties;
        }

        /// <summary>
        /// Helper method to determine category based on type name patterns
        /// </summary>
        private string GetCategoryFromFieldName(string fieldName)
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
