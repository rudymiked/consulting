using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace APIWarmer;

public class APIWarmer
{
    private readonly ILogger<APIWarmer> _logger;

    public APIWarmer(ILogger<APIWarmer> logger)
    {
        _logger = logger;
    }

    [Function("APIWarmer")]
    public async Task Run([TimerTrigger("0 */5 5-21 * * *", RunOnStartup = false)] TimerInfo timerInfo)
    {
        _logger.LogInformation("Starting API warm-up call...");

        using HttpClient httpClient = new();
        try {
            var response = await httpClient.GetAsync("https://rudyardapi-f3bydsa9avgneva5.canadacentral-01.azurewebsites.net/api/");
            var content = await response.Content.ReadAsStringAsync();

            _logger.LogInformation($"API responded with status: {response.StatusCode}");
            _logger.LogInformation($"Response content: {content}");
        } catch (Exception ex) {
            _logger.LogError($"Error warming up API: {ex.Message}");
        }
    }
}