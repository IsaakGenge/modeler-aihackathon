// Backend/ModelerAPI.ApiService/Configuration/CorsSettings.cs
namespace ModelerAPI.ApiService.Configuration
{
    public class CorsSettings
    {
        public const string SectionName = "Cors";
        public string[] AllowedOrigins { get; set; } = Array.Empty<string>();
    }
}
