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

        /// <summary>
        /// Extracts custom properties from a valueMap response from Gremlin
        /// </summary>
        /// <param name="valueMap">The dynamic valueMap object from Gremlin response</param>
        /// <returns>Dictionary of custom properties</returns>
        /// <summary>
        /// Extracts custom properties from a valueMap response from Gremlin
        /// </summary>
        /// <param name="valueMap">The dynamic valueMap object from Gremlin response</param>
        /// <returns>Dictionary of custom properties</returns>
        public Dictionary<string, object> ExtractCustomProperties(dynamic valueMap)
        {
            var customProperties = new Dictionary<string, object>();

            try
            {
                // Log the valueMap type for debugging
                string valueMapType = valueMap?.GetType()?.FullName ?? "null";
                Logger.LogDebug("ExtractCustomProperties received valueMap of type: {Type}", valueMapType);

                // Handle the case when valueMap is a dictionary
                var valueMapDict = valueMap as Dictionary<string, object>;
                if (valueMapDict != null)
                {
                    foreach (var prop in valueMapDict)
                    {
                        // Skip system properties
                        if (IsSystemProperty(prop.Key))
                        {
                            continue;
                        }

                        object finalValue = null;

                        // Extract the property value
                        if (prop.Value is IEnumerable<object> values)
                        {
                            // This is the typical Gremlin response format for property values
                            try
                            {
                                // Check if the first item is a dictionary with 'value' key
                                var firstItem = values.FirstOrDefault();

                                if (firstItem is Dictionary<string, object> valueDict && valueDict.ContainsKey("value"))
                                {
                                    // Get the raw value
                                    var rawValue = valueDict["value"];

                                    // Convert to appropriate type
                                    finalValue = ConvertToAppropriateType(rawValue, prop.Key);

                                    Logger.LogDebug("Extracted custom property {PropKey}={PropValue} (Type: {ValueType})",
                                        prop.Key, finalValue, finalValue?.GetType().Name ?? "null");
                                }
                                else
                                {
                                    // If the values collection contains simple values (not dictionaries)
                                    // Just use the first value directly
                                    if (firstItem != null)
                                    {
                                        finalValue = ConvertToAppropriateType(firstItem, prop.Key);

                                        Logger.LogDebug("Extracted direct value from collection for {PropKey}={PropValue} (Type: {ValueType})",
                                            prop.Key, finalValue, finalValue?.GetType().Name ?? "null");
                                    }
                                }
                            }
                            catch (InvalidCastException ex)
                            {
                                // Log the error but continue processing
                                Logger.LogWarning(ex, "Failed to cast collection item for property {PropKey}, trying alternative extraction", prop.Key);

                                // Fallback to treating the values collection as a single value
                                finalValue = ConvertToAppropriateType(prop.Value, prop.Key);
                            }
                        }
                        else if (prop.Value is string simpleString)
                        {
                            // Direct string property - try to convert to appropriate type
                            finalValue = ConvertToAppropriateType(simpleString, prop.Key);

                            Logger.LogDebug("Extracted simple string property {PropKey}={PropValue} (Type: {ValueType})",
                                prop.Key, finalValue, finalValue?.GetType().Name ?? "null");
                        }
                        else if (prop.Value is Dictionary<string, object> directDict && directDict.ContainsKey("value"))
                        {
                            // Dictionary with 'value' property
                            var rawValue = directDict["value"];
                            finalValue = ConvertToAppropriateType(rawValue, prop.Key);

                            Logger.LogDebug("Extracted dictionary property {PropKey}={PropValue} (Type: {ValueType})",
                                prop.Key, finalValue, finalValue?.GetType().Name ?? "null");
                        }
                        else if (prop.Value != null)
                        {
                            // For other types, try to use the raw value
                            finalValue = ConvertToAppropriateType(prop.Value, prop.Key);

                            Logger.LogDebug("Extracted raw property {PropKey}={PropValue} (Type: {ValueType})",
                                prop.Key, finalValue, finalValue?.GetType().Name ?? "null");
                        }

                        if (finalValue != null)
                        {
                            customProperties[prop.Key] = finalValue;
                        }
                    }
                }
                else if (valueMap != null)
                {
                    // If valueMap is not a dictionary, try to handle it as a dynamic object
                    try
                    {
                        // This handles the case where valueMap is a dynamic object with properties
                        foreach (var prop in valueMap)
                        {
                            string key = prop.Key?.ToString();
                            if (string.IsNullOrEmpty(key) || IsSystemProperty(key))
                                continue;

                            object value = prop.Value;
                            var finalValue = ConvertToAppropriateType(value, key);
                            if (finalValue != null)
                            {
                                customProperties[key] = finalValue;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Logger.LogWarning(ex, "Could not extract properties from non-dictionary valueMap");
                    }
                }

                // Log the final custom properties count
                Logger.LogDebug("Extracted {Count} custom properties", customProperties.Count);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error extracting custom properties");
            }

            return customProperties;
        }


        /// <summary>
        /// Converts a value to its appropriate type based on content
        /// </summary>
        private object ConvertToAppropriateType(object value, string propertyName)
        {
            if (value == null)
                return null;

            // Log the actual type of the value for debugging
            Logger.LogDebug("Converting property {Property} with value type {Type}: {Value}",
                propertyName, value.GetType().Name, value);

            // Handle numeric types directly
            if (value is int or long or short or byte or sbyte or uint or ulong or ushort or float or double or decimal)
            {
                Logger.LogDebug("Numeric value detected - keeping as {Type}: {Value}", value.GetType().Name, value);
                return value;
            }

            // Handle boolean types directly
            if (value is bool boolValue)
            {
                Logger.LogDebug("Boolean value detected: {Value}", boolValue);
                return boolValue;
            }

            // Handle DateTime types directly
            if (value is DateTime dateTimeValue)
            {
                Logger.LogDebug("DateTime value detected: {Value}", dateTimeValue);
                return dateTimeValue;
            }

            // Handle string values - try to convert to the most appropriate type
            if (value is string stringValue)
            {
                // Empty string stays as empty string
                if (string.IsNullOrEmpty(stringValue))
                    return stringValue;

                // Try boolean
                if (stringValue.Equals("true", StringComparison.OrdinalIgnoreCase))
                {
                    Logger.LogDebug("String value '{Value}' converted to boolean: true", stringValue);
                    return true;
                }
                if (stringValue.Equals("false", StringComparison.OrdinalIgnoreCase))
                {
                    Logger.LogDebug("String value '{Value}' converted to boolean: false", stringValue);
                    return false;
                }
                if (stringValue.Equals("yes", StringComparison.OrdinalIgnoreCase))
                {
                    Logger.LogDebug("String value '{Value}' converted to boolean: true", stringValue);
                    return true;
                }
                if (stringValue.Equals("no", StringComparison.OrdinalIgnoreCase))
                {
                    Logger.LogDebug("String value '{Value}' converted to boolean: false", stringValue);
                    return false;
                }

                // Try integer (only if it looks like a pure number)
                if (int.TryParse(stringValue, out int intValue) &&
                    !stringValue.Contains(".") && !stringValue.Contains(","))
                {
                    Logger.LogDebug("String value '{Value}' converted to integer: {ConvertedValue}",
                        stringValue, intValue);
                    return intValue;
                }

                // Try double (for decimal numbers)
                // Replace comma with period for culture-invariant parsing
                string invariantString = stringValue.Replace(',', '.');
                if (double.TryParse(invariantString,
                    System.Globalization.NumberStyles.Float,
                    System.Globalization.CultureInfo.InvariantCulture,
                    out double doubleValue))
                {
                    Logger.LogDebug("String value '{Value}' converted to double: {ConvertedValue}",
                        stringValue, doubleValue);
                    return doubleValue;
                }

                // Try DateTime (especially for properties that might contain dates)
                if ((propertyName.Contains("date", StringComparison.OrdinalIgnoreCase) ||
                     propertyName.Contains("time", StringComparison.OrdinalIgnoreCase) ||
                     propertyName.EndsWith("At", StringComparison.OrdinalIgnoreCase)) &&
                    DateTime.TryParse(stringValue, out DateTime dateValue))
                {
                    Logger.LogDebug("String value '{Value}' converted to DateTime: {ConvertedValue}",
                        stringValue, dateValue);
                    return dateValue;
                }

                // Try to parse JSON objects or arrays
                if ((stringValue.StartsWith("{") && stringValue.EndsWith("}")) ||
                    (stringValue.StartsWith("[") && stringValue.EndsWith("]")))
                {
                    try
                    {
                        var jsonResult = System.Text.Json.JsonSerializer.Deserialize<object>(stringValue);
                        Logger.LogDebug("String value successfully parsed as JSON");
                        return jsonResult;
                    }
                    catch (Exception ex)
                    {
                        Logger.LogDebug("Failed to parse string as JSON: {Error}", ex.Message);
                        // If JSON parsing fails, keep as string
                    }
                }

                Logger.LogDebug("Keeping value as string: {Value}", stringValue);
                // Fallback to string
                return stringValue;
            }

            // For JsonElement, handle appropriately
            if (value is System.Text.Json.JsonElement jsonElement)
            {
                switch (jsonElement.ValueKind)
                {
                    case System.Text.Json.JsonValueKind.Number:
                        if (jsonElement.TryGetInt32(out int intVal))
                        {
                            Logger.LogDebug("JsonElement converted to int: {Value}", intVal);
                            return intVal;
                        }

                        if (jsonElement.TryGetDouble(out double doubleVal))
                        {
                            Logger.LogDebug("JsonElement converted to double: {Value}", doubleVal);
                            return doubleVal;
                        }
                        break;

                    case System.Text.Json.JsonValueKind.True:
                        return true;

                    case System.Text.Json.JsonValueKind.False:
                        return false;

                    case System.Text.Json.JsonValueKind.String:
                        // Try to convert string to appropriate type
                        return ConvertToAppropriateType(jsonElement.GetString(), propertyName);
                }
            }

            // Return the value as is for other types
            Logger.LogDebug("Using value as is, type: {Type}", value.GetType().Name);
            return value;
        }

        /// <summary>
        /// Determines if a property is a system property that should not be included in custom properties
        /// </summary>
        /// <param name="propertyName">Name of the property to check</param>
        /// <returns>True if it's a system property, false otherwise</returns>
        private bool IsSystemProperty(string propertyName)
        {
            // Define system properties that are not considered custom properties
            string[] systemProperties = new[]
            {
        "id", "name", "nodeType", "edgeType", "graphId", "pkey",
        "positionX", "positionY", "createdAt", "source", "target"
    };

            return systemProperties.Contains(propertyName, StringComparer.OrdinalIgnoreCase);
        }

        #endregion
    }
}
