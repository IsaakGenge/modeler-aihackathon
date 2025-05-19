using Google.Protobuf.WellKnownTypes;

var builder = DistributedApplication.CreateBuilder(args);
var apiService = builder.AddProject<Projects.ModelerAPI_ApiService>("apiservice");

var frontendApp = builder.AddNpmApp("frontend", "../../Frontend")
    .WithReference(apiService)
    .WithEndpoint(targetPort:4200, scheme: "http", name: "frontend", isProxied:false);



builder.Build().Run();
