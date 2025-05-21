using System;
using System.IO;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Azure.Cosmos;
using System.Text.Json;

namespace ModelerAPI.CosmosDbImport
{
    public class ImportProgram
    {
        // Connection info
        private static readonly string EndpointUrl = "https://localhost:8081";
        private static readonly string PrimaryKey = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";
        private static readonly string DatabaseName = "db1";
        private static readonly string ContainerName = "coll1";
        
        public static async Task Main(string[] args)
        {
            // Create a new Cosmos client
            CosmosClient cosmosClient = new CosmosClient(EndpointUrl, PrimaryKey, new CosmosClientOptions
            {
                ConnectionMode = ConnectionMode.Gateway
            });

            // Get a reference to the database
            Database database = cosmosClient.GetDatabase(DatabaseName);
            
            // Get a reference to the container
            Container container = database.GetContainer(ContainerName);

            // Import node types
            await ImportDocumentsFromFile(container, "node_types.json");
            
            // Import edge types
            await ImportDocumentsFromFile(container, "edge_types.json");
            
            Console.WriteLine("Import completed successfully.");
        }
        
        private static async Task ImportDocumentsFromFile(Container container, string filePath)
        {
            // Read the JSON file
            string json = File.ReadAllText(filePath);
            
            // Parse the JSON array
            var items = JsonSerializer.Deserialize<List<object>>(json);
            
            Console.WriteLine($"Importing {items.Count} items from {filePath}...");
            
            // Create items in Cosmos DB
            foreach (var item in items)
            {
                string itemJson = JsonSerializer.Serialize(item);
                await container.CreateItemAsync(item, new PartitionKey(GetPartitionKeyFromItem(itemJson)));
            }
            
            Console.WriteLine($"Successfully imported items from {filePath}.");
        }
        
        private static string GetPartitionKeyFromItem(string json)
        {
            // Parse the JSON to get the partition key
            var document = JsonDocument.Parse(json);
            var partitionKeyElement = document.RootElement.GetProperty("partitionKey");
            return partitionKeyElement.GetString();
        }
    }
}
