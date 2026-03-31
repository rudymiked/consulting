import dns from 'dns';
import https from 'https';
import http from 'http';
import { promisify } from 'util';
import { HealthStatus, IDomainHealthCheck, TableNames } from './models';
import { queryEntities, updateEntity, insertEntity } from './tableClientHelper';
import { sendEmail } from './emailHelper';

const resolveMx = promisify(dns.resolveMx);

/**
 * Extract bare hostname from a domain string
 * Handles: "example.com", "https://example.com", "https://example.com/", "example.com/"
 * Returns: "example.com"
 */
export function normalizeDomain(domain: string): string {
  try {
    // If it looks like a full URL, parse it
    if (domain.includes('://')) {
      const url = new URL(domain);
      return url.hostname;
    }
    // Otherwise remove trailing slash and return
    return domain.replace(/\/$/, '').toLowerCase().trim();
  } catch {
    // If URL parsing fails, just clean up and return
    return domain.replace(/\/$/, '').toLowerCase().trim();
  }
}

export async function checkEmailHealth(domain: string): Promise<{ status: HealthStatus; error?: string }> {
  try {
    const mxRecords = await resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      return { status: HealthStatus.HEALTHY };
    }
    return { status: HealthStatus.DOWN, error: 'No MX records found' };
  } catch (err: any) {
    return { status: HealthStatus.DOWN, error: err.message };
  }
}

export async function checkWebsiteHealth(domain: string): Promise<{ status: HealthStatus; error?: string }> {
  return new Promise((resolve) => {
    const protocol = domain.startsWith('http') ? (domain.startsWith('https') ? https : http) : https;
    const url = domain.startsWith('http') ? domain : `https://${domain}`;

    const request = (domain.startsWith('https') ? https : http).request(
      url,
      { method: 'HEAD', timeout: 10000 },
      (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve({ status: HealthStatus.HEALTHY });
        } else {
          resolve({ status: HealthStatus.DOWN, error: `HTTP ${res.statusCode}` });
        }
      }
    );

    request.on('error', (err: any) => {
      resolve({ status: HealthStatus.DOWN, error: err.message });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({ status: HealthStatus.DOWN, error: 'Request timeout' });
    });

    request.end();
  });
}

export async function performDomainHealthCheck(
  clientId: string,
  domain: string
): Promise<IDomainHealthCheck> {
  try {
    // Normalize domain to bare hostname
    const normalizedDomain = normalizeDomain(domain);
    console.log(`[performDomainHealthCheck] Starting checks for ${normalizedDomain} (client: ${clientId})`);
    
    let emailCheck, websiteCheck;
    try {
      console.log(`[performDomainHealthCheck] Running email/website checks...`);
      [emailCheck, websiteCheck] = await Promise.all([
        checkEmailHealth(normalizedDomain),
        checkWebsiteHealth(normalizedDomain),
      ]);
      console.log(`[performDomainHealthCheck] Checks complete. Email: ${emailCheck.status}, Website: ${websiteCheck.status}`);
    } catch (checkErr: any) {
      console.error(`[performDomainHealthCheck] Error running health checks for ${normalizedDomain}:`, checkErr);
      throw checkErr;
    }

    const healthCheck: IDomainHealthCheck = {
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
      await insertEntity(TableNames.DomainHealth, healthCheck);
      console.log(`[performDomainHealthCheck] Health check stored successfully`);
    } catch (storageErr: any) {
      console.error(`[performDomainHealthCheck] Error storing domain health check for ${normalizedDomain}:`, storageErr);
      throw storageErr;
    }

  // Send alert emails if either check failed
  if (emailCheck.status === HealthStatus.DOWN || websiteCheck.status === HealthStatus.DOWN) {
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
        await sendEmail({
          to: process.env.ALERT_EMAIL || 'info@rudyardtechnologies.com',
          subject: alertSubject,
          text: alertBody,
          sent: false,
        });
      } catch (err: any) {
        console.error('Error sending alert email:', err);
      }
    }

    return healthCheck;
  } catch (err: any) {
    console.error(`[performDomainHealthCheck] Unexpected error for ${domain}:`, err);
    throw err;
  }
}

export async function getLatestDomainHealthCheck(
  clientId: string,
  domain: string
): Promise<IDomainHealthCheck | null> {
  try {
    // Escape single quotes in domain for OData query
    const escapedDomain = domain.replace(/'/g, "''");
    const results: any[] = await queryEntities(
      TableNames.DomainHealth,
      `PartitionKey eq '${clientId}' and domain eq '${escapedDomain}'`
    );
    if (results.length === 0) return null;
    // Return the most recent (last inserted)
    return results[results.length - 1] as IDomainHealthCheck;
  } catch (err) {
    console.error('Error fetching domain health check:', err);
    return null;
  }
}
