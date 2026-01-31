using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Functions.Worker;

namespace APIWarmer
{
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
            _logger.LogInformation("Starting API warm-up...");

            var stopwatch = Stopwatch.StartNew();

            using HttpClient httpClient = new();

            var endpoints = new[]
            {
            "https://rudyardapi-f3bydsa9avgneva5.canadacentral-01.azurewebsites.net/api/",
            "https://rudyardapi-f3bydsa9avgneva5.canadacentral-01.azurewebsites.net/api/table-warmer"
        };

            var tasks = endpoints.Select(async url =>
            {
                try
                {
                    var response = await httpClient.GetAsync(url);
                    var content = await response.Content.ReadAsStringAsync();

                    _logger.LogInformation($"[{url}] Status: {response.StatusCode}");
                    _logger.LogDebug($"[{url}] Response: {content}");
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Error warming [{url}]: {ex.Message}");
                }
            });

            await Task.WhenAll(tasks);

            stopwatch.Stop();
            _logger.LogInformation($"Warm-up complete in {stopwatch.ElapsedMilliseconds}ms");
        }
    }
}