using ModelerAPI.ApiService.Services;
using ModelerAPI.ApiService.Configuration;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

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

var app = builder.Build();
// Configure the HTTP request pipeline.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();
app.MapDefaultEndpoints();
// Make sure to use CORS in the app configuration
app.UseCors();

app.Run();
