"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDomain = normalizeDomain;
exports.checkEmailHealth = checkEmailHealth;
exports.checkWebsiteHealth = checkWebsiteHealth;
exports.performDomainHealthCheck = performDomainHealthCheck;
exports.getLatestDomainHealthCheck = getLatestDomainHealthCheck;
const dns_1 = __importDefault(require("dns"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const util_1 = require("util");
const models_1 = require("./models");
const tableClientHelper_1 = require("./tableClientHelper");
const emailHelper_1 = require("./emailHelper");
const resolveMx = (0, util_1.promisify)(dns_1.default.resolveMx);
/**
 * Extract bare hostname from a domain string
 * Handles: "example.com", "https://example.com", "https://example.com/", "example.com/"
 * Returns: "example.com"
 */
function normalizeDomain(domain) {
    try {
        // If it looks like a full URL, parse it
        if (domain.includes('://')) {
            const url = new URL(domain);
            return url.hostname;
        }
        // Otherwise remove trailing slash and return
        return domain.replace(/\/$/, '').toLowerCase().trim();
    }
    catch {
        // If URL parsing fails, just clean up and return
        return domain.replace(/\/$/, '').toLowerCase().trim();
    }
}
function getDomainVariants(domain) {
    const normalized = normalizeDomain(domain);
    const variants = normalized.startsWith('www.')
        ? [normalized, normalized.replace(/^www\./, '')]
        : [normalized, `www.${normalized}`];
    return Array.from(new Set(variants.filter(Boolean)));
}
async function checkEmailHealth(domain) {
    try {
        const mxRecords = await Promise.race([
            resolveMx(domain),
            new Promise((_, reject) => setTimeout(() => reject(new Error('MX lookup timeout after 10000ms')), 10000)),
        ]);
        if (mxRecords && mxRecords.length > 0) {
            return { status: models_1.HealthStatus.HEALTHY };
        }
        return { status: models_1.HealthStatus.DOWN, error: 'No MX records found' };
    }
    catch (err) {
        return { status: models_1.HealthStatus.DOWN, error: err.message };
    }
}
async function checkWebsiteHealth(domain) {
    return new Promise((resolve) => {
        const url = domain.startsWith('http://') || domain.startsWith('https://')
            ? domain
            : `https://${domain}`;
        try {
            const parsed = new URL(url);
            const client = parsed.protocol === 'https:' ? https_1.default : http_1.default;
            const request = client.request(parsed, { method: 'HEAD', timeout: 10000 }, (res) => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
                    resolve({ status: models_1.HealthStatus.HEALTHY });
                }
                else {
                    resolve({ status: models_1.HealthStatus.DOWN, error: `HTTP ${res.statusCode}` });
                }
            });
            request.on('error', (err) => {
                resolve({ status: models_1.HealthStatus.DOWN, error: err.message });
            });
            request.on('timeout', () => {
                request.destroy();
                resolve({ status: models_1.HealthStatus.DOWN, error: 'Request timeout' });
            });
            request.end();
        }
        catch (err) {
            resolve({ status: models_1.HealthStatus.DOWN, error: err?.message || 'Invalid URL' });
        }
    });
}
async function performDomainHealthCheck(clientId, domain) {
    try {
        // Normalize domain to bare hostname
        const normalizedDomain = normalizeDomain(domain);
        console.log(`[performDomainHealthCheck] Starting checks for ${normalizedDomain} (client: ${clientId})`);
        let emailCheck, websiteCheck;
        try {
            const variants = getDomainVariants(normalizedDomain);
            console.log(`[performDomainHealthCheck] Running checks for variants: ${variants.join(', ')}`);
            const [emailResults, websiteResults] = await Promise.all([
                Promise.all(variants.map((variant) => checkEmailHealth(variant))),
                Promise.all(variants.map((variant) => checkWebsiteHealth(variant))),
            ]);
            const healthyEmail = emailResults.find((r) => r.status === models_1.HealthStatus.HEALTHY);
            const healthyWebsite = websiteResults.find((r) => r.status === models_1.HealthStatus.HEALTHY);
            emailCheck = healthyEmail ?? {
                status: models_1.HealthStatus.DOWN,
                error: variants
                    .map((variant, i) => `${variant}: ${emailResults[i].error ?? 'unknown error'}`)
                    .join(' | '),
            };
            websiteCheck = healthyWebsite ?? {
                status: models_1.HealthStatus.DOWN,
                error: variants
                    .map((variant, i) => `${variant}: ${websiteResults[i].error ?? 'unknown error'}`)
                    .join(' | '),
            };
            console.log(`[performDomainHealthCheck] Checks complete. Email: ${emailCheck.status}, Website: ${websiteCheck.status}`);
        }
        catch (checkErr) {
            console.error(`[performDomainHealthCheck] Error running health checks for ${normalizedDomain}:`, checkErr);
            throw checkErr;
        }
        const healthCheck = {
            partitionKey: clientId,
            rowKey: `${normalizedDomain}-${Date.now()}`,
            clientId,
            domain: normalizedDomain,
            emailStatus: emailCheck.status,
            websiteStatus: websiteCheck.status,
            emailError: emailCheck.error,
            websiteError: websiteCheck.error,
            lastCheckTime: new Date(),
        };
        // Store the health check result
        try {
            console.log(`[performDomainHealthCheck] Storing health check to table storage...`);
            await (0, tableClientHelper_1.insertEntity)(models_1.TableNames.DomainHealth, healthCheck);
            console.log(`[performDomainHealthCheck] Health check stored successfully`);
        }
        catch (storageErr) {
            console.error(`[performDomainHealthCheck] Error storing domain health check for ${normalizedDomain}:`, storageErr);
            // Do not fail the health API response if persistence fails.
            // We still want callers (function/UI) to receive the live check result.
        }
        // Send alert emails if either check failed
        if (emailCheck.status === models_1.HealthStatus.DOWN || websiteCheck.status === models_1.HealthStatus.DOWN) {
            const alertSubject = `⚠️ Domain Health Alert for ${normalizedDomain}`;
            const alertBody = `
Domain Health Check Failed for: ${normalizedDomain}

Email Status: ${emailCheck.status.toUpperCase()}
${emailCheck.error ? `Error: ${emailCheck.error}` : ''}

Website Status: ${websiteCheck.status.toUpperCase()}
${websiteCheck.error ? `Error: ${websiteCheck.error}` : ''}

Time: ${new Date().toLocaleString()}
      `.trim();
            try {
                await (0, emailHelper_1.sendEmail)({
                    to: process.env.ALERT_EMAIL || 'info@rudyardtechnologies.com',
                    subject: alertSubject,
                    text: alertBody,
                    sent: false,
                });
            }
            catch (err) {
                console.error('Error sending alert email:', err);
            }
        }
        return healthCheck;
    }
    catch (err) {
        console.error(`[performDomainHealthCheck] Unexpected error for ${domain}:`, err);
        throw err;
    }
}
async function getLatestDomainHealthCheck(clientId, domain) {
    try {
        // Escape single quotes in domain for OData query
        const escapedDomain = domain.replace(/'/g, "''");
        const results = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.DomainHealth, `PartitionKey eq '${clientId}' and domain eq '${escapedDomain}'`);
        if (results.length === 0)
            return null;
        // Return the most recent (last inserted)
        return results[results.length - 1];
    }
    catch (err) {
        console.error('Error fetching domain health check:', err);
        return null;
    }
}
