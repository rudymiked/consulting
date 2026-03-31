using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Functions.Worker;

namespace APIWarmer
{
    public class DomainHealthCheck
    {
        private readonly ILogger<DomainHealthCheck> _logger;

        public DomainHealthCheck(ILogger<DomainHealthCheck> logger)
        {
            _logger = logger;
        }

        [Function("DomainHealthCheck")]
        public async Task Run([TimerTrigger("0 */15 * * * *", RunOnStartup = false)] TimerInfo timerInfo)
        {
            _logger.LogInformation("Starting scheduled domain health checks...");

            var stopwatch = Stopwatch.StartNew();

            try
            {
                var apiUrl = Environment.GetEnvironmentVariable("API_URL") ??
                    "https://rudyardapi-f3bydsa9avgneva5.canadacentral-01.azurewebsites.net";
                var apiKey = Environment.GetEnvironmentVariable("DOMAIN_HEALTH_API_KEY")
                    ?? Environment.GetEnvironmentVariable("API_KEY");

                if (string.IsNullOrEmpty(apiKey))
                {
                    _logger.LogWarning("DOMAIN_HEALTH_API_KEY/API_KEY not configured. Skipping health checks.");
                    return;
                }

                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

                // Get all clients
                var clientsUrl = $"{apiUrl}/api/clients";
                var clientsResponse = await httpClient.GetAsync(clientsUrl);

                if (!clientsResponse.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to fetch clients: {clientsResponse.StatusCode}");
                    return;
                }

                var clientsContent = await clientsResponse.Content.ReadAsStringAsync();
                var clients = JsonSerializer.Deserialize<List<ClientDto>>(clientsContent, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (clients == null || clients.Count == 0)
                {
                    _logger.LogInformation("No clients found.");
                    return;
                }

                var checksCompleted = 0;
                var checksFailed = 0;

                foreach (var client in clients)
                {
                    try
                    {
                        // Get domains for this client
                        var domainsUrl = $"{apiUrl}/api/admin/client/{client.Id}/domains";
                        var domainsResponse = await httpClient.GetAsync(domainsUrl);

                        if (!domainsResponse.IsSuccessStatusCode)
                        {
                            _logger.LogWarning($"Failed to fetch domains for client {client.Id}: {domainsResponse.StatusCode}");
                            continue;
                        }

                        var domainsContent = await domainsResponse.Content.ReadAsStringAsync();
                        var domains = JsonSerializer.Deserialize<List<DomainDto>>(domainsContent, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                        if (domains == null || domains.Count == 0)
                        {
                            _logger.LogDebug($"No domains configured for client {client.Id}");
                            continue;
                        }

                        foreach (var domain in domains)
                        {
                            try
                            {
                                // Trigger health check for this domain
                                var checkUrl = $"{apiUrl}/api/admin/domain-health/{client.Id}/check/{Uri.EscapeDataString(domain.Domain)}";
                                var checkResponse = await httpClient.PostAsync(checkUrl, null);

                                if (checkResponse.IsSuccessStatusCode)
                                {
                                    _logger.LogInformation($"Health check completed for {domain.Domain} (client: {client.Name})");
                                    checksCompleted++;
                                }
                                else
                                {
                                    _logger.LogWarning($"Health check failed for {domain.Domain}: {checkResponse.StatusCode}");
                                    checksFailed++;
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError($"Error checking domain {domain.Domain}: {ex.Message}");
                                checksFailed++;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError($"Error processing client {client.Id}: {ex.Message}");
                    }
                }

                stopwatch.Stop();
                _logger.LogInformation($"Domain health checks complete. Completed: {checksCompleted}, Failed: {checksFailed}, Time: {stopwatch.ElapsedMilliseconds}ms");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Scheduled health check job failed: {ex.Message}");
                stopwatch.Stop();
            }
        }
    }

    public class ClientDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
    }

    public class DomainDto
    {
        public string RowKey { get; set; } = string.Empty;
        public string ClientId { get; set; } = string.Empty;
        public string Domain { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
