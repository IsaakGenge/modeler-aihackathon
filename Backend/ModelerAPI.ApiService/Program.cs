using Microsoft.OpenApi.Models;
using ModelerAPI.ApiService.Configuration;
using ModelerAPI.ApiService.Services.Cosmos;
using ModelerAPI.ApiService.Services.Export;
using ModelerAPI.ApiService.Services.Import;
using ModelerAPI.ApiService.Services.ModelGenerator;
using System.Reflection;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();

// Add and configure Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Modeler API",
        Version = "v1",
        Description = "Graph modeling API for creating and managing graph models",
        Contact = new OpenApiContact
        {
            Name = "API Support",
            Email = "support@example.com"
        }
    });

    // Enable XML comments in Swagger
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

builder.Services.AddControllers();

// Configure CosmosDB settings
builder.Services.Configure<CosmosDbSettings>(
    builder.Configuration.GetSection(CosmosDbSettings.SectionName));

// Configure CORS settings
builder.Services.Configure<CorsSettings>(
    builder.Configuration.GetSection(CorsSettings.SectionName));

// Add CORS with a more permissive policy for development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        // During development, allow all origins for easier debugging
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            // In production, use the configured origins
            var corsSettings = builder.Configuration
                .GetSection(CorsSettings.SectionName)
                .Get<CorsSettings>();

            policy.WithOrigins(corsSettings?.AllowedOrigins ?? new[] { "http://localhost:4200" })
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
    });
});

// Register CosmosService as a singleton with the configured settings
builder.Services.AddSingleton<ICosmosService, CosmosService>();
builder.Services.AddSingleton<ModelGenerator>();
builder.Services.AddScoped<IExportService, ExportService>();
// Register import service
builder.Services.AddScoped<IImportService, ImportService>();



var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

// IMPORTANT: Use CORS *before* other middleware that might respond to the request
app.UseCors();

// Swagger UI middleware
// Swagger UI middleware
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    // Use a relative path that works in both local and Azure deployments
    options.SwaggerEndpoint("./swagger/v1/swagger.json", "Modeler API v1");
    options.RoutePrefix = string.Empty; // Serve the Swagger UI at the app's root
});


app.UseHttpsRedirection();
app.MapControllers();
app.MapDefaultEndpoints();

app.Run();
