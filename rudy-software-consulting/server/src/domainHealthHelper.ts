import dns from 'dns';
import https from 'https';
import http from 'http';
import { promisify } from 'util';
import { HealthStatus, IDomainHealthCheck, TableNames } from './models';
import { queryEntities, updateEntity, insertEntity } from './tableClientHelper';
import { sendEmail } from './emailHelper';

const resolveMx = promisify(dns.resolveMx);

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
  const [emailCheck, websiteCheck] = await Promise.all([
    checkEmailHealth(domain),
    checkWebsiteHealth(domain),
  ]);

  const healthCheck: IDomainHealthCheck = {
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
    await insertEntity(TableNames.DomainHealth, healthCheck);
  } catch (err: any) {
    console.error('Error storing domain health check:', err);
  }

  // Send alert emails if either check failed
  if (emailCheck.status === HealthStatus.DOWN || websiteCheck.status === HealthStatus.DOWN) {
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
}

export async function getLatestDomainHealthCheck(
  clientId: string,
  domain: string
): Promise<IDomainHealthCheck | null> {
  try {
    const results: any[] = await queryEntities(
      TableNames.DomainHealth,
      `PartitionKey eq '${clientId}' and Domain eq '${domain}'`
    );
    if (results.length === 0) return null;
    // Return the most recent (last inserted)
    return results[results.length - 1] as IDomainHealthCheck;
  } catch (err) {
    console.error('Error fetching domain health check:', err);
    return null;
  }
}
