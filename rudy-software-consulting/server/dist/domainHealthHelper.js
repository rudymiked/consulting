"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
async function checkEmailHealth(domain) {
    try {
        const mxRecords = await resolveMx(domain);
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
        const protocol = domain.startsWith('http') ? (domain.startsWith('https') ? https_1.default : http_1.default) : https_1.default;
        const url = domain.startsWith('http') ? domain : `https://${domain}`;
        const request = (domain.startsWith('https') ? https_1.default : http_1.default).request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
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
    });
}
async function performDomainHealthCheck(clientId, domain) {
    const [emailCheck, websiteCheck] = await Promise.all([
        checkEmailHealth(domain),
        checkWebsiteHealth(domain),
    ]);
    const healthCheck = {
        partitionKey: clientId,
        rowKey: `${domain}-${Date.now()}`,
        clientId,
        domain,
        emailStatus: emailCheck.status,
        websiteStatus: websiteCheck.status,
        emailError: emailCheck.error,
        websiteError: websiteCheck.error,
        lastCheckTime: new Date(),
    };
    // Store the health check result
    try {
        await (0, tableClientHelper_1.insertEntity)(models_1.TableNames.DomainHealth, healthCheck);
    }
    catch (err) {
        console.error('Error storing domain health check:', err);
    }
    // Send alert emails if either check failed
    if (emailCheck.status === models_1.HealthStatus.DOWN || websiteCheck.status === models_1.HealthStatus.DOWN) {
        const alertSubject = `⚠️ Domain Health Alert for ${domain}`;
        const alertBody = `
Domain Health Check Failed for: ${domain}

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
async function getLatestDomainHealthCheck(clientId, domain) {
    try {
        const results = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.DomainHealth, `PartitionKey eq '${clientId}' and Domain eq '${domain}'`);
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
