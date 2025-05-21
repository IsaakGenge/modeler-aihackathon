// Custom JsonConverter to handle numeric type conversions
using Gremlin.Net.Structure.IO.GraphSON;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System.Text.Json;

namespace ModelerAPI.ApiService.Services.Cosmos
{ 
    public class CustomGraphSON2Reader : GraphSON2Reader
    {
        public override dynamic ToObject(JsonElement graphSon) =>
            graphSon.ValueKind switch
            {
                // numbers
                JsonValueKind.Number when graphSon.TryGetInt32(out var intValue) => intValue,
                JsonValueKind.Number when graphSon.TryGetInt64(out var longValue) => longValue,
                JsonValueKind.Number when graphSon.TryGetDecimal(out var decimalValue) => decimalValue,


                _ => base.ToObject(graphSon)
            };
    }
}