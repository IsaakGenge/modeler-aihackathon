var builder = DistributedApplication.CreateBuilder(args);
var apiService = builder.AddProject<Projects.ModelerAPI_ApiService>("apiservice");

var frontendApp = builder.AddNpmApp("frontend", "../../Frontend")
    .WithReference(apiService)
    .WithEndpoint(targetPort: 4200, scheme: "http", name: "frontend");



builder.Build().Run();
