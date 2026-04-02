using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Azure.Identity;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace APIWarmer;

public class LicenseMonitor
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = false,
    };

    private readonly ILogger<LicenseMonitor> _logger;

    public LicenseMonitor(ILogger<LicenseMonitor> logger)
    {
        _logger = logger;
    }

    // Run once daily at 8:00 AM. Use WEBSITE_TIME_ZONE=Pacific Standard Time in app settings.
    [Function("LicenseMonitor")]
    public async Task Run([TimerTrigger("0 0 8 * * *", RunOnStartup = false)] TimerInfo timerInfo)
    {
        await Execute(sendEmail: true, triggerName: "timer");
    }

    // Manual on-demand run for validation. Default is dry run (no email send).
    [Function("LicenseMonitorDryRun")]
    public async Task<HttpResponseData> DryRun(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = "license-monitor/dry-run")] HttpRequestData req)
    {
        var sendEmail = req.Url.Query.Contains("sendEmail=true", StringComparison.OrdinalIgnoreCase);
        var result = await Execute(sendEmail, "http");

        var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
        await response.WriteAsJsonAsync(result);
        return response;
    }

    private async Task<object> Execute(bool sendEmail, string triggerName)
    {
        var sw = Stopwatch.StartNew();
        _logger.LogInformation("Starting license monitor job. Trigger={TriggerName}, SendEmail={SendEmail}", triggerName, sendEmail);

        var apiUrl = Environment.GetEnvironmentVariable("API_URL")
            ?? "https://rudyardapi-f3bydsa9avgneva5.canadacentral-01.azurewebsites.net";
        var apiKey = Environment.GetEnvironmentVariable("DOMAIN_HEALTH_API_KEY")
            ?? Environment.GetEnvironmentVariable("API_KEY");

        var unusedThreshold = GetIntSetting("LICENSE_ALERT_UNUSED_THRESHOLD", 5);
        var unusedPercentThreshold = GetDoubleSetting("LICENSE_ALERT_UNUSED_PERCENT_THRESHOLD", 10);
        var maxUnlicensedUsers = GetIntSetting("LICENSE_REPORT_MAX_UNLICENSED_USERS", 100);
        var emailRecipients = ParseEmailRecipients(
            Environment.GetEnvironmentVariable("LICENSE_REPORT_EMAIL_TO")
            ?? "info@rudyardtechnologies.com");

        if (sendEmail && string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("DOMAIN_HEALTH_API_KEY/API_KEY not configured. Cannot send license email report.");
            return new { success = false, error = "Missing API key for email send" };
        }

        try
        {
            var tenantMappings = await GetTenantMappings(apiUrl, apiKey);

            if (tenantMappings.Count == 0)
            {
                tenantMappings = GetSingleTenantFallback();
            }

            if (tenantMappings.Count == 0)
            {
                _logger.LogWarning("No active tenant mappings found. Configure client tenants or fallback tenant env vars.");
                return new { success = false, error = "No tenant mappings configured" };
            }

            var skuRows = new List<SkuRow>();
            var unlicensedRows = new List<UnlicensedUserRow>();

            foreach (var mapping in tenantMappings)
            {
                var tenantResult = await CollectTenantData(mapping, maxUnlicensedUsers);
                skuRows.AddRange(tenantResult.SkuRows);
                unlicensedRows.AddRange(tenantResult.UnlicensedUsers);
            }

            var payload = BuildEmailPayload(
                skuRows,
                unlicensedRows,
                unusedThreshold,
                unusedPercentThreshold,
                emailRecipients,
                triggerName,
                sendEmail);

            if (sendEmail)
            {
                using var apiHttp = new HttpClient();
                apiHttp.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
                var content = new StringContent(JsonSerializer.Serialize(payload, JsonOpts), Encoding.UTF8, "application/json");
                var response = await apiHttp.PostAsync($"{apiUrl}/api/admin/send-license-report", content);

                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("License report email request failed: {StatusCode}. Body: {Body}", response.StatusCode, body);
                }
                else
                {
                    _logger.LogInformation(
                        "License report sent successfully. SKU count: {SkuCount}, Unlicensed users (sample): {UserCount}",
                        skuRows.Count,
                        unlicensedRows.Count);
                }
            }
            else
            {
                _logger.LogInformation(
                    "License report dry run completed. SKU count: {SkuCount}, Unlicensed users (sample): {UserCount}",
                    skuRows.Count,
                    unlicensedRows.Count);
            }

            return new
            {
                success = true,
                sendEmail,
                tenantCount = tenantMappings.Count,
                skuCount = skuRows.Count,
                unlicensedUserCount = unlicensedRows.Count,
                recipients = emailRecipients,
                thresholds = new { unusedThreshold, unusedPercentThreshold },
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "License monitor failed.");
            return new { success = false, error = ex.Message };
        }
        finally
        {
            sw.Stop();
            _logger.LogInformation("License monitor complete in {Elapsed}ms", sw.ElapsedMilliseconds);
        }
    }

    private static int GetIntSetting(string key, int fallback)
    {
        var raw = Environment.GetEnvironmentVariable(key);
        return int.TryParse(raw, out var value) ? value : fallback;
    }

    private static double GetDoubleSetting(string key, double fallback)
    {
        var raw = Environment.GetEnvironmentVariable(key);
        return double.TryParse(raw, out var value) ? value : fallback;
    }

    private static List<string> ParseEmailRecipients(string csv)
    {
        return csv
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private async Task<List<ClientTenantMapping>> GetTenantMappings(string apiUrl, string? apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return new List<ClientTenantMapping>();
        }

        try
        {
            using var apiHttp = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
            apiHttp.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
            var response = await apiHttp.GetAsync($"{apiUrl}/api/admin/client-tenants");
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Could not load client-tenant mappings: {StatusCode}", response.StatusCode);
                return new List<ClientTenantMapping>();
            }

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<List<ClientTenantMapping>>(json, JsonOpts) ?? new List<ClientTenantMapping>();
            return data.Where(x => x.Active).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed loading tenant mappings from API.");
            return new List<ClientTenantMapping>();
        }
    }

    private static List<ClientTenantMapping> GetSingleTenantFallback()
    {
        var tenantId = Environment.GetEnvironmentVariable("AZURE_TENANT_ID");
        var graphClientId = Environment.GetEnvironmentVariable("RUDYARD_CLIENT_APP_REG_AZURE_CLIENT_ID");
        var secret = Environment.GetEnvironmentVariable("RUDYARD_CLIENT_APP_REG_AZURE_CLIENT_SECRET");

        if (string.IsNullOrWhiteSpace(tenantId) || string.IsNullOrWhiteSpace(graphClientId) || string.IsNullOrWhiteSpace(secret))
        {
            return new List<ClientTenantMapping>();
        }

        return new List<ClientTenantMapping>
        {
            new()
            {
                ClientId = "unassigned",
                ClientName = "Unassigned",
                TenantId = tenantId,
                TenantName = tenantId,
                GraphClientId = graphClientId,
                GraphClientSecretSettingName = "RUDYARD_CLIENT_APP_REG_AZURE_CLIENT_SECRET",
                Active = true,
            }
        };
    }

    private async Task<TenantCollectionResult> CollectTenantData(ClientTenantMapping mapping, int maxUnlicensedUsers)
    {
        var secret = Environment.GetEnvironmentVariable(mapping.GraphClientSecretSettingName);
        if (string.IsNullOrWhiteSpace(secret))
        {
            _logger.LogWarning(
                "Skipping tenant {TenantId} for client {ClientId}: secret setting {SecretSetting} is not configured.",
                mapping.TenantId,
                mapping.ClientId,
                mapping.GraphClientSecretSettingName);
            return new TenantCollectionResult();
        }

        try
        {
            var token = await GetGraphAccessToken(mapping.TenantId, mapping.GraphClientId, secret);

            using var graphHttp = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
            graphHttp.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var skus = await GetSubscribedSkus(graphHttp);
            var unlicensedUsers = await GetUnlicensedUsers(graphHttp, maxUnlicensedUsers);
            var expiryBySku = await GetSubscriptionExpirations(graphHttp);

            return new TenantCollectionResult
            {
                SkuRows = skus.Select(s => new SkuRow
                {
                    ClientId = mapping.ClientId,
                    ClientName = mapping.ClientName,
                    TenantId = mapping.TenantId,
                    TenantName = mapping.TenantName,
                    SkuId = s.SkuId,
                    SkuPartNumber = s.SkuPartNumber,
                    TotalUnits = s.TotalUnits,
                    ConsumedUnits = s.ConsumedUnits,
                    AvailableUnits = s.AvailableUnits,
                    CapabilityStatus = s.CapabilityStatus,
                    Expiration = expiryBySku.TryGetValue(s.SkuId, out var exp) ? exp : "unknown",
                }).ToList(),
                UnlicensedUsers = unlicensedUsers.Select(u => new UnlicensedUserRow
                {
                    ClientId = mapping.ClientId,
                    ClientName = mapping.ClientName,
                    TenantId = mapping.TenantId,
                    TenantName = mapping.TenantName,
                    DisplayName = u.DisplayName,
                    UserPrincipalName = u.UserPrincipalName,
                }).ToList(),
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed collecting tenant data for client {ClientId}, tenant {TenantId}", mapping.ClientId, mapping.TenantId);
            return new TenantCollectionResult();
        }
    }

    private static async Task<string> GetGraphAccessToken(string tenantId, string clientId, string clientSecret)
    {
        var credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        var tokenContext = new Azure.Core.TokenRequestContext(new[] { "https://graph.microsoft.com/.default" });
        var token = await credential.GetTokenAsync(tokenContext, CancellationToken.None);
        return token.Token;
    }

    private async Task<List<SkuSnapshot>> GetSubscribedSkus(HttpClient graphHttp)
    {
        const string endpoint = "https://graph.microsoft.com/v1.0/subscribedSkus?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits,capabilityStatus";
        using var response = await graphHttp.GetAsync(endpoint);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var result = new List<SkuSnapshot>();
        if (!doc.RootElement.TryGetProperty("value", out var value) || value.ValueKind != JsonValueKind.Array)
        {
            return result;
        }

        foreach (var sku in value.EnumerateArray())
        {
            var skuId = GetString(sku, "skuId") ?? string.Empty;
            var skuPartNumber = GetString(sku, "skuPartNumber") ?? "unknown";
            var consumed = GetInt(sku, "consumedUnits");
            var enabled = 0;

            if (sku.TryGetProperty("prepaidUnits", out var prepaidUnits))
            {
                enabled = GetInt(prepaidUnits, "enabled");
            }

            result.Add(new SkuSnapshot
            {
                SkuId = skuId,
                SkuPartNumber = skuPartNumber,
                ConsumedUnits = consumed,
                TotalUnits = enabled,
                AvailableUnits = Math.Max(0, enabled - consumed),
                CapabilityStatus = GetString(sku, "capabilityStatus") ?? "unknown",
            });
        }

        return result.OrderBy(r => r.SkuPartNumber).ToList();
    }

    private async Task<List<UnlicensedUserSnapshot>> GetUnlicensedUsers(HttpClient graphHttp, int limit)
    {
        var users = new List<UnlicensedUserSnapshot>();
        var endpoint = "https://graph.microsoft.com/v1.0/users?$top=999&$select=id,displayName,userPrincipalName,assignedLicenses,accountEnabled,userType";

        while (!string.IsNullOrWhiteSpace(endpoint))
        {
            using var response = await graphHttp.GetAsync(endpoint);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            if (doc.RootElement.TryGetProperty("value", out var value) && value.ValueKind == JsonValueKind.Array)
            {
                foreach (var user in value.EnumerateArray())
                {
                    var accountEnabled = GetBool(user, "accountEnabled", true);
                    var userType = GetString(user, "userType") ?? "Member";
                    if (!accountEnabled || !userType.Equals("Member", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    var hasAssignedLicenses = false;
                    if (user.TryGetProperty("assignedLicenses", out var assignedLicenses) && assignedLicenses.ValueKind == JsonValueKind.Array)
                    {
                        hasAssignedLicenses = assignedLicenses.GetArrayLength() > 0;
                    }

                    if (!hasAssignedLicenses)
                    {
                        users.Add(new UnlicensedUserSnapshot
                        {
                            DisplayName = GetString(user, "displayName") ?? "(no display name)",
                            UserPrincipalName = GetString(user, "userPrincipalName") ?? "(no upn)",
                        });
                    }
                }
            }

            endpoint = null;
            if (doc.RootElement.TryGetProperty("@odata.nextLink", out var nextLink) && nextLink.ValueKind == JsonValueKind.String)
            {
                endpoint = nextLink.GetString();
            }
        }

        return users
            .OrderBy(u => u.UserPrincipalName)
            .Take(Math.Max(1, limit))
            .ToList();
    }

    private async Task<Dictionary<string, string>> GetSubscriptionExpirations(HttpClient graphHttp)
    {
        // Best-effort: this endpoint can vary by tenant/permissions/commerce setup.
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        try
        {
            const string endpoint = "https://graph.microsoft.com/beta/directory/subscriptions?$select=skuId,nextLifecycleDateTime,status";
            using var response = await graphHttp.GetAsync(endpoint);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Subscription expiration endpoint unavailable: {StatusCode}", response.StatusCode);
                return map;
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("value", out var value) || value.ValueKind != JsonValueKind.Array)
            {
                return map;
            }

            foreach (var sub in value.EnumerateArray())
            {
                var skuId = GetString(sub, "skuId");
                if (string.IsNullOrWhiteSpace(skuId))
                {
                    continue;
                }

                var lifecycle = GetString(sub, "nextLifecycleDateTime");
                var status = GetString(sub, "status") ?? "unknown";
                var expiryLabel = string.IsNullOrWhiteSpace(lifecycle)
                    ? $"status={status}, expiry unknown"
                    : $"{lifecycle} (status={status})";

                map[skuId] = expiryLabel;
            }
        }
        catch (Exception ex)
        {
            _logger.LogInformation(ex, "Could not retrieve subscription expirations. Continuing with unknown expiry values.");
        }

        return map;
    }

    private object BuildEmailPayload(
        List<SkuRow> skus,
        List<UnlicensedUserRow> unlicensedUsers,
        int unusedThreshold,
        double unusedPercentThreshold,
        List<string> emailRecipients,
        string triggerName,
        bool sendEmail)
    {
        var totalUnits = skus.Sum(s => s.TotalUnits);
        var consumedUnits = skus.Sum(s => s.ConsumedUnits);
        var availableUnits = skus.Sum(s => s.AvailableUnits);

        var lowAvailabilitySkus = skus
            .Where(s =>
                s.AvailableUnits <= unusedThreshold ||
                (s.TotalUnits > 0 && ((double)s.AvailableUnits / s.TotalUnits) * 100 <= unusedPercentThreshold))
            .Select(s => new
            {
                sku = s.SkuPartNumber,
                clientName = s.ClientName,
                tenantName = s.TenantName,
                available = s.AvailableUnits,
                total = s.TotalUnits,
                consumed = s.ConsumedUnits,
                availablePercent = s.TotalUnits > 0 ? Math.Round(((double)s.AvailableUnits / s.TotalUnits) * 100, 2) : 0,
            })
            .ToList();

        var skuDetails = skus.Select(s => new
        {
            skuId = s.SkuId,
            skuPartNumber = s.SkuPartNumber,
            clientId = s.ClientId,
            clientName = s.ClientName,
            tenantId = s.TenantId,
            tenantName = s.TenantName,
            totalUnits = s.TotalUnits,
            consumedUnits = s.ConsumedUnits,
            availableUnits = s.AvailableUnits,
            unusedUnits = s.AvailableUnits,
            capabilityStatus = s.CapabilityStatus,
            availablePercent = s.TotalUnits > 0 ? Math.Round(((double)s.AvailableUnits / s.TotalUnits) * 100, 2) : 0,
            expiration = s.Expiration,
        }).ToList();

        var users = unlicensedUsers.Select(u => new
        {
            clientId = u.ClientId,
            clientName = u.ClientName,
            tenantId = u.TenantId,
            tenantName = u.TenantName,
            displayName = u.DisplayName,
            userPrincipalName = u.UserPrincipalName,
        }).ToList();

        return new
        {
            generatedAtUtc = DateTime.UtcNow,
            trigger = triggerName,
            sendEmail,
            emailRecipients,
            summary = new
            {
                skuCount = skus.Count,
                totalUnits,
                consumedUnits,
                availableUnits,
                unlicensedUserCount = unlicensedUsers.Count,
                lowAvailabilitySkuCount = lowAvailabilitySkus.Count,
                tenantCount = skus.Select(x => x.TenantId).Distinct(StringComparer.OrdinalIgnoreCase).Count(),
                unusedThreshold,
                unusedPercentThreshold,
                expirationSource = "Graph beta directory/subscriptions (best effort)",
            },
            lowAvailabilitySkus,
            skuDetails,
            unlicensedUsers = users,
        };
    }

    private static string? GetString(JsonElement node, string propertyName)
    {
        if (!node.TryGetProperty(propertyName, out var value))
        {
            return null;
        }

        return value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
    }

    private static int GetInt(JsonElement node, string propertyName)
    {
        if (!node.TryGetProperty(propertyName, out var value))
        {
            return 0;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetInt32(out var number) => number,
            JsonValueKind.String when int.TryParse(value.GetString(), out var parsed) => parsed,
            _ => 0,
        };
    }

    private static bool GetBool(JsonElement node, string propertyName, bool fallback)
    {
        if (!node.TryGetProperty(propertyName, out var value))
        {
            return fallback;
        }

        return value.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String when bool.TryParse(value.GetString(), out var parsed) => parsed,
            _ => fallback,
        };
    }

    private sealed class SkuSnapshot
    {
        public string SkuId { get; set; } = string.Empty;
        public string SkuPartNumber { get; set; } = string.Empty;
        public int TotalUnits { get; set; }
        public int ConsumedUnits { get; set; }
        public int AvailableUnits { get; set; }
        public string CapabilityStatus { get; set; } = string.Empty;
    }

    private sealed class UnlicensedUserSnapshot
    {
        public string DisplayName { get; set; } = string.Empty;
        public string UserPrincipalName { get; set; } = string.Empty;
    }

    private sealed class ClientTenantMapping
    {
        public string ClientId { get; set; } = string.Empty;
        public string? ClientName { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string? TenantName { get; set; }
        public string GraphClientId { get; set; } = string.Empty;
        public string GraphClientSecretSettingName { get; set; } = string.Empty;
        public bool Active { get; set; } = true;
    }

    private sealed class SkuRow
    {
        public string ClientId { get; set; } = string.Empty;
        public string? ClientName { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string? TenantName { get; set; }
        public string SkuId { get; set; } = string.Empty;
        public string SkuPartNumber { get; set; } = string.Empty;
        public int TotalUnits { get; set; }
        public int ConsumedUnits { get; set; }
        public int AvailableUnits { get; set; }
        public string CapabilityStatus { get; set; } = string.Empty;
        public string Expiration { get; set; } = "unknown";
    }

    private sealed class UnlicensedUserRow
    {
        public string ClientId { get; set; } = string.Empty;
        public string? ClientName { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string? TenantName { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string UserPrincipalName { get; set; } = string.Empty;
    }

    private sealed class TenantCollectionResult
    {
        public List<SkuRow> SkuRows { get; set; } = new();
        public List<UnlicensedUserRow> UnlicensedUsers { get; set; } = new();
    }
}
