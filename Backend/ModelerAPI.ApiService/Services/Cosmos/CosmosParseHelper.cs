using Microsoft.Extensions.Logging;
using ModelerAPI.ApiService.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ModelerAPI.ApiService.Services.Cosmos
{
    /// <summary>
    /// Helper class for parsing Cosmos DB/Gremlin response objects into domain models
    /// </summary>
    public class CosmosParseHelper
    {
        private readonly ILogger Logger;

        public CosmosParseHelper(ILogger logger)
        {
            Logger = logger;
        }

        /// <summary>
        /// Parses a Gremlin vertex response into a Node object
        /// </summary>
        /// <param name="item">The dynamic vertex object from Gremlin response</param>
        /// <param name="graphId">Optional graph ID to use if not found in properties</param>
        /// <returns>A parsed Node object</returns>
        public Node ParseNodeFromVertex(dynamic item, string graphId = null)
        {
            try
            {
                // Use indexer syntax for dynamic objects
                string id = item["id"].ToString();
                string name = "";
                string nodeType = item["label"].ToString(); // Get the label as nodeType
                DateTime createdAt = DateTime.UtcNow;
                string nodeGraphId = graphId ?? ""; // Default to empty if not provided
                double? positionX = null;
                double? positionY = null;
                Dictionary<string, object> customProperties = new Dictionary<string, object>();

                // Extract properties safely
                if (item["properties"] != null)
                {
                    dynamic properties = item["properties"];

                    // Extract name
                    name = ExtractStringProperty(properties, "name", id);

                    // Extract createdAt
                    createdAt = ExtractDateTimeProperty(properties, "createdAt", id) ?? DateTime.UtcNow;

                    // Extract positions
                    positionX = ExtractDoubleProperty(properties, "positionX", id);
                    positionY = ExtractDoubleProperty(properties, "positionY", id);

                    // Extract graphId if it wasn't provided as a parameter
                    if (string.IsNullOrEmpty(graphId))
                    {
                        nodeGraphId = ExtractGraphId(properties, id);
                    }

                    // Extract custom properties (all properties that aren't standard ones)
                    var propsDict = properties as Dictionary<string, object>;
                    if (propsDict != null)
                    {
                        foreach (var prop in propsDict)
                        {
                            // Skip standard properties we've already extracted
                            if (prop.Key == "name" || prop.Key == "createdAt" ||
                                prop.Key == "positionX" || prop.Key == "positionY" ||
                                prop.Key == "graphId" || prop.Key == "pkey")
                            {
                                continue;
                            }

                            // Extract the property value
                            var values = prop.Value as IEnumerable<object>;
                            if (values != null)
                            {
                                var valueObj = values.Cast<Dictionary<string, object>>().FirstOrDefault();
                                if (valueObj != null && valueObj.ContainsKey("value"))
                                {
                                    customProperties[prop.Key] = valueObj["value"];
                                }
                            }
                        }
                    }
                }

                return new Node
                {
                    Id = id,
                    Name = name,
                    NodeType = nodeType,
                    CreatedAt = createdAt,
                    GraphId = nodeGraphId,
                    PositionX = positionX,
                    PositionY = positionY,
                    Properties = customProperties
                };
            }
            catch (Exception ex)
            {
                // Log the exception and return null
                Logger.LogError(ex, "Error parsing node: {Message}", ex.Message);
                return null;
            }
        }

        /// <summary>
        /// Parses a Gremlin edge response into an Edge object
        /// </summary>
        /// <param name="item">The dynamic edge object from Gremlin response</param>
        /// <param name="graphId">Optional graph ID to use if not found in properties</param>
        /// <returns>A parsed Edge object</returns>
        public Edge ParseEdgeFromEdge(dynamic item, string graphId = null)
        {
            try
            {
                // Use indexer syntax for dynamic objects
                string id = item["id"].ToString();
                string source = item["outV"].ToString();
                string target = item["inV"].ToString();
                string edgeType = item["label"].ToString();
                DateTime createdAt = DateTime.UtcNow;
                string edgeGraphId = graphId ?? "";
                Dictionary<string, object> customProperties = new Dictionary<string, object>();

                // Extract additional properties from the properties collection
                if (item["properties"] != null)
                {
                    dynamic properties = item["properties"];

                    // Extract createdAt
                    createdAt = ExtractDateTimeProperty(properties, "createdAt", id) ?? DateTime.UtcNow;

                    // Extract graphId if it wasn't provided as a parameter
                    if (string.IsNullOrEmpty(graphId))
                    {
                        edgeGraphId = ExtractGraphId(properties, id);
                    }

                    // Extract custom properties (all properties that aren't standard ones)
                    var propsDict = properties as Dictionary<string, object>;

                    // Log the properties dictionary to help with debugging
                    Logger.LogDebug("Edge {Id} properties: {Properties}", id,
                        System.Text.Json.JsonSerializer.Serialize(propsDict));

                    if (propsDict != null)
                    {
                        foreach (var prop in propsDict)
                        {
                            // Skip standard properties we've already extracted
                            if (prop.Key == "createdAt" || prop.Key == "graphId" || prop.Key == "pkey" || prop.Key == "id")
                            {
                                continue;
                            }

                            try
                            {
                                // Try different approaches to extract the property value
                                if (prop.Value is string simpleString)
                                {
                                    // Direct string property
                                    customProperties[prop.Key] = simpleString;
                                    Logger.LogDebug("Extracted simple string property {PropKey}={PropValue} for edge {Id}",
                                        prop.Key, simpleString, id);
                                }
                                else if (prop.Value is IEnumerable<object> values)
                                {
                                    // Array of values - typical Gremlin format
                                    var valueObj = values.Cast<Dictionary<string, object>>().FirstOrDefault();
                                    if (valueObj != null && valueObj.ContainsKey("value"))
                                    {
                                        customProperties[prop.Key] = valueObj["value"];
                                        Logger.LogDebug("Extracted property {PropKey}={PropValue} for edge {Id}",
                                            prop.Key, valueObj["value"], id);
                                    }
                                }
                                else if (prop.Value is Dictionary<string, object> directDict)
                                {
                                    // Direct dictionary property
                                    if (directDict.ContainsKey("value"))
                                    {
                                        customProperties[prop.Key] = directDict["value"];
                                        Logger.LogDebug("Extracted dictionary property {PropKey}={PropValue} for edge {Id}",
                                            prop.Key, directDict["value"], id);
                                    }
                                    else
                                    {
                                        // Use the whole dictionary as the value
                                        customProperties[prop.Key] = directDict;
                                        Logger.LogDebug("Extracted full dictionary for property {PropKey} for edge {Id}",
                                            prop.Key, id);
                                    }
                                }
                                else
                                {
                                    // For other types, try to use the raw value
                                    customProperties[prop.Key] = prop.Value;
                                    Logger.LogDebug("Extracted raw property {PropKey} for edge {Id} of type {Type}",
                                        prop.Key, id, prop.Value?.GetType().Name ?? "null");
                                }
                            }
                            catch (Exception propEx)
                            {
                                Logger.LogWarning(propEx, "Error extracting property {PropKey} for edge {Id}", prop.Key, id);
                            }
                        }
                    }

                    // Log the final custom properties to verify extraction
                    Logger.LogDebug("Edge {Id} final custom properties count: {Count}", id, customProperties.Count);
                }

                return new Edge
                {
                    Id = id,
                    Source = source,
                    Target = target,
                    EdgeType = edgeType,
                    CreatedAt = createdAt,
                    GraphId = edgeGraphId,
                    Properties = customProperties
                };
            }
            catch (Exception ex)
            {
                // Log the exception and return null
                Logger.LogError(ex, "Error parsing edge: {Message}", ex.Message);
                return null;
            }
        }

        #region Property Extraction Helpers

        /// <summary>
        /// Extracts a string property from the Gremlin properties collection
        /// </summary>
        private string ExtractStringProperty(dynamic properties, string propertyName, string elementId)
        {
            try
            {
                if (properties.ContainsKey(propertyName))
                {
                    var propsDict = properties as Dictionary<string, object>;
                    if (propsDict != null && propsDict.ContainsKey(propertyName))
                    {
                        var valueValues = propsDict[propertyName] as IEnumerable<object>;
                        if (valueValues != null)
                        {
                            var valueObj = valueValues.Cast<Dictionary<string, object>>().FirstOrDefault();
                            if (valueObj != null && valueObj.ContainsKey("value"))
                            {
                                string value = valueObj["value"]?.ToString() ?? "";
                                Logger.LogDebug("Extracted {PropertyName}: {Value} for element: {Id}", 
                                    propertyName, value, elementId);
                                return value;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error extracting {PropertyName} for element {Id}", propertyName, elementId);
            }
            
            return "";
        }

        /// <summary>
        /// Extracts a DateTime property from the Gremlin properties collection
        /// </summary>
        private DateTime? ExtractDateTimeProperty(dynamic properties, string propertyName, string elementId)
        {
            try
            {
                if (properties.ContainsKey(propertyName))
                {
                    var propsDict = properties as Dictionary<string, object>;
                    if (propsDict != null && propsDict.ContainsKey(propertyName))
                    {
                        var values = propsDict[propertyName] as IEnumerable<object>;
                        if (values != null)
                        {
                            var valueObj = values.Cast<Dictionary<string, object>>().FirstOrDefault();
                            if (valueObj != null && valueObj.ContainsKey("value"))
                            {
                                string dateString = valueObj["value"]?.ToString() ?? "";
                                if (DateTime.TryParse(dateString, out var parsedDate))
                                {
                                    Logger.LogDebug("Extracted {PropertyName}: {Value} for element: {Id}", 
                                        propertyName, parsedDate, elementId);
                                    return parsedDate;
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error extracting {PropertyName} for element {Id}", propertyName, elementId);
            }
            
            return null;
        }

        /// <summary>
        /// Extracts a double property from the Gremlin properties collection
        /// </summary>
        private double? ExtractDoubleProperty(dynamic properties, string propertyName, string elementId)
        {
            try
            {
                if (properties.ContainsKey(propertyName))
                {
                    var propsDict = properties as Dictionary<string, object>;
                    if (propsDict != null && propsDict.ContainsKey(propertyName))
                    {
                        var values = propsDict[propertyName] as IEnumerable<object>;
                        if (values != null)
                        {
                            var valueObj = values.Cast<Dictionary<string, object>>().FirstOrDefault();
                            if (valueObj != null && valueObj.ContainsKey("value"))
                            {
                                string valueString = valueObj["value"]?.ToString() ?? "";
                                if (double.TryParse(valueString, out var parsedValue))
                                {
                                    Logger.LogDebug("Extracted {PropertyName}: {Value} for element: {Id}", 
                                        propertyName, parsedValue, elementId);
                                    return parsedValue;
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error extracting {PropertyName} for element {Id}", propertyName, elementId);
            }
            
            return null;
        }

        /// <summary>
        /// Extracts graph ID from either graphId or pkey property
        /// </summary>
        private string ExtractGraphId(dynamic properties, string elementId)
        {
            // Try to extract from graphId property first
            string graphId = ExtractStringProperty(properties, "graphId", elementId);
            
            // If not found, try pkey as fallback
            if (string.IsNullOrEmpty(graphId))
            {
                graphId = ExtractStringProperty(properties, "pkey", elementId);
            }
            
            return graphId;
        }

        #endregion
    }
}
