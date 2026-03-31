using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Functions.Worker;

namespace APIWarmer
{
    /// <summary>
    /// Runs every hour. For each client, triggers a fresh health check on every
    /// registered domain, then logs whether the website and email server (MX) are up.
    /// Schedule: "0 0 * * * *" = top of every hour.
    /// </summary>
    public class ClientHealthCheck
    {
        private static readonly JsonSerializerOptions JsonOpts =
            new() { PropertyNameCaseInsensitive = true };

        private readonly ILogger<ClientHealthCheck> _logger;

        public ClientHealthCheck(ILogger<ClientHealthCheck> logger)
        {
            _logger = logger;
        }

        [Function("ClientHealthCheck")]
        public async Task Run([TimerTrigger("0 0 * * * *", RunOnStartup = false)] TimerInfo timerInfo)
        {
            _logger.LogInformation("Starting client domain/email health check...");
            var sw = Stopwatch.StartNew();

            var apiUrl = Environment.GetEnvironmentVariable("API_URL") ??
                "https://rudyardapi-f3bydsa9avgneva5.canadacentral-01.azurewebsites.net";
            var apiKey = Environment.GetEnvironmentVariable("API_KEY");

            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogWarning("API_KEY not configured. Skipping client health checks.");
                return;
            }

            using var http = new HttpClient();
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
            http.Timeout = TimeSpan.FromSeconds(30);

            try
            {
                // 1. Fetch all clients
                var clientsResponse = await http.GetAsync($"{apiUrl}/api/clients");
                if (!clientsResponse.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to fetch clients: {StatusCode}", clientsResponse.StatusCode);
                    return;
                }

                var clients = JsonSerializer.Deserialize<List<ClientDto>>(
                    await clientsResponse.Content.ReadAsStringAsync(), JsonOpts);

                if (clients == null || clients.Count == 0)
                {
                    _logger.LogInformation("No clients found.");
                    return;
                }

                _logger.LogInformation("Checking {Count} client(s)...", clients.Count);

                var totalDomains = 0;
                var domainsDown = 0;
                var domainResults = new List<DomainCheckResult>();

                // 2. For each client, fetch domains then run a health check per domain
                foreach (var client in clients)
                {
                    var domainsResponse = await http.GetAsync(
                        $"{apiUrl}/api/admin/client/{client.Id}/domains");

                    if (!domainsResponse.IsSuccessStatusCode)
                    {
                        _logger.LogWarning(
                            "Could not fetch domains for client {ClientId} ({Name}): {StatusCode}",
                            client.Id, client.Name, domainsResponse.StatusCode);
                        continue;
                    }

                    var domains = JsonSerializer.Deserialize<List<DomainDto>>(
                        await domainsResponse.Content.ReadAsStringAsync(), JsonOpts);

                    if (domains == null || domains.Count == 0)
                    {
                        _logger.LogDebug("No domains registered for client {ClientId}", client.Id);
                        continue;
                    }

                    foreach (var d in domains)
                    {
                        totalDomains++;
                        try
                        {
                            // 3. Trigger a live check — returns emailStatus + websiteStatus
                            var checkUrl = $"{apiUrl}/api/admin/domain-health/{client.Id}/check/{Uri.EscapeDataString(d.Domain)}";
                            var checkResponse = await http.PostAsync(checkUrl, null);

                            if (!checkResponse.IsSuccessStatusCode)
                            {
                                _logger.LogWarning(
                                    "[DOWN] {Domain} (client: {Name}) — check endpoint returned {StatusCode}",
                                    d.Domain, client.Name, checkResponse.StatusCode);
                                domainsDown++;
                                domainResults.Add(new DomainCheckResult
                                {
                                    ClientName = client.Name,
                                    Domain = d.Domain,
                                    WebsiteStatus = "unknown",
                                    WebsiteError = $"Check endpoint returned {checkResponse.StatusCode}",
                                    EmailStatus = "unknown",
                                });
                                continue;
                            }

                            var result = JsonSerializer.Deserialize<DomainHealthResultDto>(
                                await checkResponse.Content.ReadAsStringAsync(), JsonOpts);

                            if (result == null)
                            {
                                _logger.LogWarning("[DOWN] {Domain} (client: {Name}) — empty response", d.Domain, client.Name);
                                domainsDown++;
                                domainResults.Add(new DomainCheckResult
                                {
                                    ClientName = client.Name,
                                    Domain = d.Domain,
                                    WebsiteStatus = "unknown",
                                    WebsiteError = "Empty response from check endpoint",
                                    EmailStatus = "unknown",
                                });
                                continue;
                            }

                            var websiteUp = string.Equals(result.WebsiteStatus, "healthy", StringComparison.OrdinalIgnoreCase);
                            var emailUp   = string.Equals(result.EmailStatus,   "healthy", StringComparison.OrdinalIgnoreCase);

                            domainResults.Add(new DomainCheckResult
                            {
                                ClientName    = client.Name,
                                Domain        = d.Domain,
                                WebsiteStatus = result.WebsiteStatus ?? "unknown",
                                WebsiteError  = result.WebsiteError,
                                EmailStatus   = result.EmailStatus ?? "unknown",
                                EmailError    = result.EmailError,
                            });

                            if (websiteUp && emailUp)
                            {
                                _logger.LogInformation(
                                    "[UP] {Domain} (client: {Name}) — website: up, email/MX: up",
                                    d.Domain, client.Name);
                            }
                            else
                            {
                                domainsDown++;
                                var issues = new List<string>();
                                if (!websiteUp) issues.Add($"website {result.WebsiteStatus ?? "unknown"}: {result.WebsiteError ?? "no detail"}");
                                if (!emailUp)   issues.Add($"email/MX {result.EmailStatus ?? "unknown"}: {result.EmailError ?? "no detail"}");

                                _logger.LogWarning(
                                    "[DOWN] {Domain} (client: {Name} / {Email}) — {Issues}",
                                    d.Domain, client.Name, client.ContactEmail,
                                    string.Join("; ", issues));
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error checking {Domain} for client {ClientId}", d.Domain, client.Id);
                            domainsDown++;
                            domainResults.Add(new DomainCheckResult
                            {
                                ClientName    = client.Name,
                                Domain        = d.Domain,
                                WebsiteStatus = "unknown",
                                WebsiteError  = ex.Message,
                                EmailStatus   = "unknown",
                            });
                        }
                    }
                }

                sw.Stop();
                _logger.LogInformation(
                    "Client health check complete in {Elapsed}ms. Domains checked: {Total}, Issues: {Down}",
                    sw.ElapsedMilliseconds, totalDomains, domainsDown);

                // 4. Send email if there are failures, or it's the noon daily report (UTC)
                var isNoonReport = DateTime.UtcNow.Hour == 12;
                var shouldEmail  = domainsDown > 0 || isNoonReport;

                if (shouldEmail && domainResults.Count > 0)
                {
                    await SendHealthReportEmail(http, apiUrl, isNoonReport, totalDomains, domainsDown, domainResults);
                }
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "Client health check failed after {Elapsed}ms", sw.ElapsedMilliseconds);
            }
        }

        private async Task SendHealthReportEmail(
            HttpClient http,
            string apiUrl,
            bool isDailyReport,
            int totalDomains,
            int domainsDown,
            List<DomainCheckResult> results)
        {
            try
            {
                var payload = new
                {
                    isDailyReport,
                    totalDomains,
                    domainsDown,
                    results = results.Select(r => new
                    {
                        clientName    = r.ClientName,
                        domain        = r.Domain,
                        websiteStatus = r.WebsiteStatus,
                        websiteError  = r.WebsiteError,
                        emailStatus   = r.EmailStatus,
                        emailError    = r.EmailError,
                    }),
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                var response = await http.PostAsync($"{apiUrl}/api/admin/send-health-report", content);
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation(
                        "Health report email sent. Daily={IsDailyReport}, Issues={Down}/{Total}",
                        isDailyReport, domainsDown, totalDomains);
                }
                else
                {
                    _logger.LogWarning(
                        "Failed to send health report email: {StatusCode}",
                        response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending health report email");
            }
        }
    }

    // DTOs (ClientDto and DomainDto are shared with DomainHealthCheck.cs)

    public class DomainCheckResult
    {
        public string ClientName    { get; set; } = string.Empty;
        public string Domain        { get; set; } = string.Empty;
        public string WebsiteStatus { get; set; } = string.Empty;
        public string? WebsiteError { get; set; }
        public string EmailStatus   { get; set; } = string.Empty;
        public string? EmailError   { get; set; }
    }

    public class DomainHealthResultDto
    {
        public string? EmailStatus   { get; set; }
        public string? WebsiteStatus { get; set; }
        public string? EmailError    { get; set; }
        public string? WebsiteError  { get; set; }
    }
}
