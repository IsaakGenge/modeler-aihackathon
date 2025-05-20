using ModelerAPI.ApiService.Services;
using ModelerAPI.ApiService.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;
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

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var corsSettings = builder.Configuration
            .GetSection(CorsSettings.SectionName)
            .Get<CorsSettings>();

        policy.WithOrigins(corsSettings?.AllowedOrigins ?? new[] { "http://localhost:4200" })
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Register CosmosService as a singleton with the configured settings
builder.Services.AddSingleton<ICosmosService, CosmosService>();
builder.Services.AddSingleton<ModelGenerator>();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

// Swagger UI middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Modeler API v1");
        options.RoutePrefix = string.Empty; // Serve the Swagger UI at the app's root
    });
}

app.UseHttpsRedirection();
app.UseCors();
app.MapControllers();
app.MapDefaultEndpoints();

app.Run();
