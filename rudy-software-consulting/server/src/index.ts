import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import appInsights from "applicationinsights";
import { insertIntoContactLogs, sendEmail } from './emailHelper';
import jwksClient from 'jwks-rsa';
import { expressjwt } from 'express-jwt';
import { createInvoice, deleteInvoice, finalizePayment, getInvoiceDetails, getInvoices, payInvoice, updateInvoice } from './invoiceHelper';
import { trackEvent, trackException } from './telemetry';
import { approveUser, unapproveUser, toggleAdmin, loginUser, registerUser, verifyToken } from './authHelper';
import { IEmailOptions, IInvoice, IInvoiceResult, IInvoiceStatus, IWarmerEntity, TableNames } from './models';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { queryEntities, updateEntity } from './tableClientHelper';
import { addClient, deleteClient, getAllClients, getClientByEmail, getClientById, getClientsByName, getInvoicesByClientId } from './clientHelper';
import { addOrUpdateClientTenant, deleteClientTenant, getAllClientTenants, getClientTenants } from './clientTenantHelper';
import { addDomainToClient, getClientDomains, removeDomain } from './domainHelper';
import { performDomainHealthCheck, getLatestDomainHealthCheck } from './domainHealthHelper';

dotenv.config();

const conn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || "";

if (!conn) {
  console.log("Application Insights not configured (no connection string).");
} else {
  try {
    appInsights?.setup(conn)
      .setAutoCollectRequests(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, true)
      .setAutoCollectExceptions(true)
      .setAutoDependencyCorrelation(true)
      .start();

    if (appInsights?.defaultClient?.context?.tags) {
      const roleKey = appInsights.defaultClient.context.keys.cloudRole;
      appInsights.defaultClient.context.tags[roleKey] =
        process.env.APPINSIGHTS_ROLE_NAME || "rudyard-api";
    }

    console.log("Application Insights initialized");
  } catch (err: any) {
    console.error("Failed to initialize Application Insights:", err?.message || err);
  }
}

export const appInsightsClient = appInsights?.defaultClient;

const app = express();

app.set('trust proxy', 1); // or true

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyGenerator: (req) => {
    // Prefer X-Forwarded-For if present
    const forwarded = req.headers["x-forwarded-for"];
    let ip: string | undefined;

    if (typeof forwarded === "string") {
      ip = forwarded.split(",")[0].trim();
    } else if (Array.isArray(forwarded)) {
      ip = forwarded[0];
    } else {
      ip = req.socket.remoteAddress || "";
    }

    // Normalize IPv6 ::ffff: prefix
    if (ip.startsWith("::ffff:")) {
      ip = ip.substring(7);
    }

    // Strip port if present
    if (ip.includes(":") && /^[0-9.]+:[0-9]+$/.test(ip)) {
      ip = ip.split(":")[0];
    }

    return ip || "unknown";
  },
});

app.use(limiter);

// Security middleware
app.use(helmet());
app.use(cookieParser());

// Rate limiting for authentication endpoints (stricter than general limiter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                     // 20 attempts per 15 minutes
  keyGenerator: (req) => {
    const email = req.body?.email || req.ip;
    return `login-${email}`;
  },
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,                     // 3 registrations per hour per IP
  keyGenerator: (req) => {
    return `register-${req.ip}`;
  },
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const PORT = process.env.PORT || 4001;

const required = [
  'RUDYARD_STORAGE_ACCOUNT_NAME',
  'AZURE_TENANT_ID',
  'RUDYARD_CLIENT_APP_REG_AZURE_CLIENT_ID'
];

const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required env vars:', missing);
  process.exit(1); // fail fast so App Service shows startup error
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

// Middleware
// Allow CORS only from known origins.
console.log('Configuring CORS settings...');
console.log('FRONTEND_ORIGIN: ', process.env.FRONTEND_ORIGIN ?? "<not set>");
const frontendOrigin = (process.env.FRONTEND_ORIGIN || '').trim();
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://rudyardtechnologies.com',
  'https://www.rudyardtechnologies.com',
];

if (frontendOrigin) {
  if (frontendOrigin.startsWith('http://') || frontendOrigin.startsWith('https://')) {
    allowedOrigins.push(frontendOrigin);
  } else {
    allowedOrigins.push(`https://${frontendOrigin}`);
    allowedOrigins.push(`https://www.${frontendOrigin}`);
  }
}

console.log('CORS allowed origins:', allowedOrigins);

const corsOptions = {
  origin: (origin: any, callback: any) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Handle preflight requests centrally without using a path pattern that breaks path-to-regexp.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    // run the CORS middleware for this request then end with 204
    return cors(corsOptions)(req as any, res as any, () => res.sendStatus(204));
  }
  next();
});

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api/')) {
      trackEvent('API_Request', {
        method: req.method,
        path: req.path,
        statusCode: String(res.statusCode),
        durationMs: String(duration),
        hasAuth: String(!!req.headers.authorization)
      });
    }
  });
  next();
});

// JWT Validation Setup
const jwksClientInstance = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

async function getSigningKey(header: any): Promise<string> {
  const kid = header?.kid;
  const alg = header?.alg;
  const typ = header?.typ;
  
  trackEvent('JWT_GetSigningKey', { kid: kid || 'none', alg: alg || 'unknown', typ: typ || 'unknown' });
  console.log('JWT header:', JSON.stringify(header));
  
  // If no KID provided, this is likely a custom JWT (from /api/login), not an Azure AD token
  if (!kid) {
    console.error('ERROR: No KID in token header. This token appears to be a custom JWT, not an Azure AD token.');
    console.error('Endpoints using jwtCheck require Azure AD tokens. Custom JWTs should use /api/protected endpoint.');
    trackEvent('JWT_WrongTokenType', { alg, typ, message: 'Token missing KID - likely custom JWT sent to Azure AD protected endpoint' });
    throw new Error('Invalid token: Azure AD token required. This appears to be a custom JWT token.');
  }

  return new Promise((resolve, reject) => {
    jwksClientInstance.getSigningKey(kid, (err, key) => {
      if (err) {
        trackException(err, { context: 'getSigningKey', kid });
        reject(err);
      } else {
        const signingKey = key?.getPublicKey();
        if (typeof signingKey === 'string') {
          resolve(signingKey);
        } else {
          const error = new Error('Signing key is undefined');
          trackException(error, { context: 'getSigningKey', kid });
          reject(error);
        }
      }
    });
  });
}

const jwtCheck = expressjwt({
  secret: getSigningKey,
  algorithms: ['RS256'],
  issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
  audience: `api://${process.env.RUDYARD_CLIENT_APP_REG_AZURE_CLIENT_ID}`
});

// Custom JWT middleware - verifies tokens created by /api/login
const customJwtCheck = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  
  if (!user) {
    trackEvent('CustomJWT_ValidationFailed', { path: req.path });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Attach user to request (similar to how jwtCheck attaches req.auth)
  req.user = user;
  next();
};

// Helper to get user from custom JWT token (attached by customJwtCheck)
function getUserFromCustomToken(req: any): { email: string; clientId: string; siteAdmin: boolean } | null {
  return req.user || null;
}

// API Key validation middleware for scheduled jobs
const apiKeyCheck = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const expectedApiKey = process.env.DOMAIN_HEALTH_API_KEY;

  if (!expectedApiKey) {
    console.warn('DOMAIN_HEALTH_API_KEY not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (token !== expectedApiKey) {
    trackEvent('APIKey_ValidationFailed', { path: req.path });
    return res.status(403).json({ error: 'Invalid API key' });
  }

  // Mark as API key authenticated (not user-based)
  req.apiKeyAuthenticated = true;
  next();
};

// Helper to check if request is authenticated (either JWT or API key)
function isAuthenticated(req: any): boolean {
  return !!(req.user || req.apiKeyAuthenticated);
}

// Combined middleware: accepts JWT OR API key
const authCheck = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  // Try JWT first
  const user = verifyToken(token);
  if (user) {
    req.user = user;
    return next();
  }

  // Fall back to API key
  const expectedApiKey = process.env.DOMAIN_HEALTH_API_KEY;
  if (expectedApiKey && token === expectedApiKey) {
    req.apiKeyAuthenticated = true;
    return next();
  }

  trackEvent('Auth_ValidationFailed', { path: req.path });
  return res.status(403).json({ error: 'Invalid credentials' });
};

// JWT error handler - must be after routes that use jwtCheck
const jwtErrorHandler = (err: any, req: any, res: any, next: any) => {
  if (err.name === 'UnauthorizedError' || err.name === 'SigningKeyNotFoundError') {
    // Log token header for debugging (don't log the full token for security)
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    let tokenInfo = 'none';
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
          tokenInfo = JSON.stringify(header);
        }
      } catch (e) {
        tokenInfo = 'invalid format';
      }
    }
    
    trackEvent('JWT_ValidationFailed', {
      path: req.path,
      errorMessage: err.message,
      errorCode: err.code || 'unknown',
      tokenHeader: tokenInfo
    });
    console.error('JWT validation failed:', err.message, 'Token header:', tokenInfo);
    return res.status(401).json({ error: 'Invalid or expired token', details: err.message });
  }
  next(err);
};

// Helper to get user info from Azure AD token and look up in database
async function getUserFromAzureToken(req: any): Promise<{ email: string; clientId: string; siteAdmin: boolean } | null> {
  const start = Date.now();
  trackEvent('GetUserFromToken_Start');
  
  const azureUser = req.auth;
  if (!azureUser) {
    trackEvent('GetUserFromToken_NoAuth', { reason: 'req.auth is null/undefined' });
    console.log('getUserFromAzureToken: No auth data in request');
    return null;
  }

  // Log all available claims for debugging
  console.log('Azure AD token claims:', JSON.stringify(azureUser, null, 2));
  trackEvent('GetUserFromToken_Claims', { 
    hasPreferredUsername: String(!!azureUser.preferred_username),
    hasEmail: String(!!azureUser.email),
    hasUpn: String(!!azureUser.upn),
    sub: azureUser.sub || 'none'
  });

  const email = (azureUser.preferred_username || azureUser.email || azureUser.upn || '').toLowerCase();
  if (!email) {
    trackEvent('GetUserFromToken_NoEmail', { claims: Object.keys(azureUser).join(',') });
    console.log('getUserFromAzureToken: No email found in token');
    return null;
  }

  try {
    console.log(`Looking up user in DB: ${email}`);
    const safeEmail = email.replace(/'/g, "''");
    const dbUsers = await queryEntities(TableNames.Users, `RowKey eq '${safeEmail}'`);
    const duration = Date.now() - start;
    
    if (!dbUsers || dbUsers.length === 0) {
      trackEvent('GetUserFromToken_UserNotInDB', { email, durationMs: String(duration) });
      console.log(`User not found in DB: ${email}`);
      return { email, clientId: '', siteAdmin: false };
    }
    
    const user = dbUsers[0] as any;
    trackEvent('GetUserFromToken_Success', { 
      email, 
      clientId: user.clientId || 'none',
      siteAdmin: String(user.siteAdmin || false),
      durationMs: String(duration)
    });
    console.log(`User found in DB: ${email}, siteAdmin: ${user.siteAdmin}, clientId: ${user.clientId}`);
    
    return {
      email: user.email || email,
      clientId: user.clientId || '',
      siteAdmin: user.siteAdmin || false
    };
  } catch (err: any) {
    const duration = Date.now() - start;
    trackException(err, { 
      context: 'getUserFromAzureToken', 
      email, 
      durationMs: String(duration),
      errorMessage: err.message 
    });
    console.error('Error looking up user:', err);
    return null;
  }
}

// Routes

app.get('/', (_, res) => {
  res.send('Welcome to the Rudyard Technologies API');
});

app.get('/api', (_, res) => {
  //console.log('API is running');
  res.send('API is running');
});

app.post('/api/contact', async (req, res) => {
  const { to, subject, text, html } = req.body;
  const options: IEmailOptions = { to, subject, text, html, sent: false };

  try {
    await insertIntoContactLogs(options);
    trackEvent('InsertContactLog_API', { to, subject });

    // Send notification email to admin
    const adminEmail = process.env.ADMIN_EMAIL;
    console.log('ADMIN_EMAIL configured:', adminEmail ? 'yes' : 'no');
    
    if (adminEmail) {
      try {
        console.log('Attempting to send notification to:', adminEmail);
        await sendEmail({
          to: adminEmail,
          subject: `New Contact Form Submission: ${subject}`,
          text: `New contact form submission:\n\nFrom: ${to}\nSubject: ${subject}\n\nMessage:\n${text}`,
          html: `<h2>New Contact Form Submission</h2>
            ${html || `<p>${text}</p>`}`,
          sent: true
        });
        console.log('Notification email sent successfully to:', adminEmail);
        trackEvent('ContactNotification_Sent', { to: adminEmail });
      } catch (emailError: any) {
        console.error('Failed to send admin notification:', emailError.message, emailError.stack);
        trackException(emailError, { context: 'ContactNotification', adminEmail });
        // Don't fail the request if notification fails
      }
    } else {
      console.warn('ADMIN_EMAIL not configured - skipping notification');
    }

    res.status(200).json({ message: 'Contacted successfully' });
  } catch (error: any) {
    console.error('Error inserting contact log:', error);
    trackException(error, { endpoint: '/api/contact', errorMessage: error.message });
    res.status(500).json({ error: 'Failed to process contact request' });
  }
});

// Protected route example
app.post('/api/sendEmail', customJwtCheck, async (req, res) => {
  const { to, subject, text, html } = req.body;

  try {
    await sendEmail({ to, subject, text, html, sent: true });
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
});

app.get('/api/ping', (_, res) => {
  res.json({ message: 'pong' });
});

app.get('/api/email', customJwtCheck, (_, res) => {
  res.json({ message: 'ok' });
});

// routes/invoice.ts
app.post('/api/invoice/finalize-payment', async (req, res) => {
  const { invoiceId, paymentIntentId } = req.body;

  if (!invoiceId || !paymentIntentId) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const result = await finalizePayment(invoiceId, paymentIntentId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Finalize error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
});

app.post('/api/invoice/pay', async (req, res) => {
  const { paymentMethodId, invoiceId, amount } = req.body;

  if (!invoiceId || !amount) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const result: IInvoiceResult & { ClientSecret?: string } = await payInvoice(invoiceId, amount, paymentMethodId);

    if (!result.Success) {
      const statusCode = result.Message.includes('Invalid') ? 400 : 500;
      return res.status(statusCode).json({ error: result.Message });
    }

    // Try to send confirmation email
    try {
      const invoice = await getInvoiceDetails(invoiceId);
      if (!invoice) throw new Error(`Invoice ${invoiceId} not found for email notification`);
      if (!invoice.contact) throw new Error(`Invoice ${invoiceId} has no contact email`);

      const to = invoice.contact;
      const subject = `Payment Received for Invoice ${invoiceId}`;
      const paidDollars = amount / 100;
      const isPartial = invoice.amount > amount;
      const isOverPaid = invoice.amount < amount;

      let text: string;
      let html: string;

      const invoiceLink: string = `https://rudyardtechnologies.com/invoice/${invoiceId}`;
      const invoiceLinkHTML: string = `<a href='${invoiceLink}'>${invoiceId}</a>`

      if (isPartial) {
        text = `${invoice.name},\n\nWe have received your partial payment of $${paidDollars} for Invoice ${invoiceId} (Total Amount: $${invoice.amount}).\n\nThank you for your business!\n\nBest regards,\nRudyard Technologies`;
        html = `<p>${invoice.name},</p><p>We have received your partial payment of <strong>$${paidDollars}</strong> for Invoice <strong>${invoiceLinkHTML}</strong> (Total Amount: <strong>$${invoice.amount}</strong>).</p><p>Thank you for your business!</p><p>Best regards,<br/>Rudyard Technologies</p>`;
      } else if (isOverPaid) {
        text = `${invoice.name},\n\nWe have received your payment of $${paidDollars} for Invoice ${invoiceId}, which exceeds the total amount due ($${invoice.amount}).\n\nWe will contact you regarding the overpayment.\n\nThank you for your business!\n\nBest regards,\nRudyard Technologies`;
        html = `<p>${invoice.name},</p><p>We have received your payment of <strong>$${paidDollars}</strong> for Invoice <strong>${invoiceLinkHTML}</strong>, which exceeds the total amount due (<strong>$${invoice.amount}</strong>).</p><p>We will contact you regarding the overpayment.</p><p>Thank you for your business!</p><p>Best regards,<br/>Rudyard Technologies</p>`;
      } else {
        text = `${invoice.name},\n\nWe have received your payment for Invoice ${invoiceId} amounting to $${paidDollars}.\n\nThank you for your business!\n\nBest regards,\nRudyard Technologies`;
        html = `<p>${invoice.name},</p><p>We have received your payment for Invoice <strong>${invoiceLinkHTML}</strong> amounting to <strong>$${paidDollars}</strong>.</p><p>Thank you for your business!</p><p>Best regards,<br/>Rudyard Technologies</p>`;
      }

      if (isPartial) {
        trackEvent('PartialPayment_Received', {
          invoiceId,
          paidAmount: amount,
          totalAmount: invoice.amount,
        });
      }

      if (isOverPaid) {
        trackEvent('OverPayment_Received', {
          invoiceId,
          paidAmount: amount,
          totalAmount: invoice.amount,
        });
      }

      await sendEmail({ to, subject, text, html, sent: true });
      trackEvent('EmailSent', { invoiceId, to });

      return res.status(200).json({
        success: true,
        message: result.Message,
        email: 'sent',
        clientSecret: result.ClientSecret, // for frontend PaymentElement
        paymentIntentId: invoice?.paymentIntentId, // for admin/debugging
      });
    } catch (emailError: any) {
      console.error('Email error:', emailError);
      trackEvent('EmailFailed', { invoiceId, error: emailError.message });

      return res.status(200).json({
        success: true,
        message: result.Message,
        email: 'failed',
        emailError: emailError.message,
      });
    }
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
});

app.get('/api/invoices', customJwtCheck, async (req: any, res) => {
  const start = Date.now();
  try {
    const user = getUserFromCustomToken(req);
    
    if (!user) {
      console.error('Invoices: Unauthorized - no user from token');
      trackEvent('Invoices_Unauthorized', { reason: 'no_user' });
      return res.status(403).json({ error: 'Unauthorized' });
    }

    console.log('Invoices: User:', { email: user.email, siteAdmin: user.siteAdmin, clientId: user.clientId });
    trackEvent('Invoices_Request', { email: user.email, siteAdmin: String(user.siteAdmin) });

    let entities: IInvoice[];
    
    // Site admins can see all invoices
    if (user.siteAdmin) {
      console.log('Invoices: Fetching all invoices for admin');
      entities = await getInvoices();
    } else {
      // Regular users only see their client's invoices
      if (!user.clientId) {
        console.log('Invoices: No clientId for user, returning empty array');
        trackEvent('Invoices_NoClientId', { email: user.email });
        return res.json([]);
      }
      console.log('Invoices: Fetching invoices for clientId:', user.clientId);
      entities = await getInvoicesByClientId(user.clientId);
    }
    
    const duration = Date.now() - start;
    console.log(`Fetched ${entities.length} invoices in ${duration}ms`);
    trackEvent('Invoices_Success', { count: String(entities.length), durationMs: String(duration) });
    res.json(entities);
  } catch (error: any) {
    const duration = Date.now() - start;
    console.error('Error fetching invoices:', error.message, error.stack);
    trackException(error, { 
      endpoint: '/api/invoices', 
      durationMs: String(duration),
      errorMessage: error.message,
      errorStack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to fetch invoices.',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

app.get('/api/invoice/:id/payment-status', async (req, res) => {
  const invoiceId = req.params.id;

  try {
    const invoice = await getInvoiceDetails(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice or payment not found.' });
    }

    // If no PaymentIntent ID, payment method is required
    if (!invoice.paymentIntentId) {
      return res.json({
        status: 'requires_payment_method',
        invoiceId,
      });
    }

    // Retrieve PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(invoice.paymentIntentId);

    if (paymentIntent.metadata?.invoiceId && paymentIntent.metadata.invoiceId !== invoiceId) {
      return res.json({
        status: 'requires_payment_method',
        invoiceId,
      });
    }

    // statuses: 
    // requires_payment_method
    // requires_confirmation
    // requires_action
    // processing
    // requires_capture
    // canceled
    // succeeded

    return res.json({
      status: paymentIntent.status, // see: https://stripe.com/docs/payments/intents#intent-statuses
      invoiceId,
    });
  } catch (err: any) {
    console.error('Error fetching payment status:', err.message);
    trackException(err, { endpoint: '/api/invoice/:id/payment-status', invoiceId });
    return res.status(500).json({ error: 'Failed to fetch payment status.' });
  }
});

app.get('/api/invoice/:invoiceId', async (req, res) => {
  const { invoiceId } = req.params;

  try {
    const invoiceDetails = await getInvoiceDetails(invoiceId);

    if (!invoiceDetails) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoiceDetails);
  } catch (err: any) {
    console.error('Error fetching invoice:', err.message);
    trackException(err, { endpoint: '/api/invoice/:invoiceId', invoiceId });
    res.status(500).json({ error: 'Failed to fetch invoice.' });
  }
});

app.post('/api/invoice', customJwtCheck, async (req, res) => {
  const { name, amount, notes, contact, clientId } = req.body;

  if (!name || !amount || !contact) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Use clientId from request, or default to contact for backwards compatibility
    const partitionKey = clientId || contact;
    const result = await createInvoice({ 
      id: `inv-${crypto.randomUUID()}`, 
      name, 
      amount, 
      notes, 
      contact,
      clientId: partitionKey,
      status: IInvoiceStatus.NEW 
    });

    trackEvent('CreateInvoice_API_Success', { invoiceId: result.invoiceId, clientId: partitionKey });
    console.log(result);

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error saving invoice:', error.message);
    trackException(error, { name, contact });
    res.status(500).json({ error: 'Failed to save invoice.' + error.message });
  }
});

app.put('/api/invoice/:invoiceId', customJwtCheck, async (req: any, res) => {
  const { invoiceId } = req.params;
  const { name, amount, notes, contact, dueDate, clientId } = req.body;
  const user = getUserFromCustomToken(req);

  if (!user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!user.siteAdmin) {
    return res.status(403).json({ error: 'Access denied: Admin only' });
  }

  if (!name || !amount || !contact) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  if (Number(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0.' });
  }

  try {
    const existingInvoice = await getInvoiceDetails(invoiceId);
    const result = await updateInvoice({
      id: invoiceId,
      name,
      amount,
      notes: notes || '',
      contact,
      clientId: clientId || undefined,
      paymentIntentId: existingInvoice.paymentIntentId,
      status: existingInvoice.status,
      dueDate: dueDate ? new Date(dueDate) : existingInvoice.dueDate,
    });

    trackEvent('UpdateInvoice_API_Success', { invoiceId, adminEmail: user.email });
    return res.status(200).json(result);
  } catch (error: any) {
    const isNotFound = String(error?.message || '').toLowerCase().includes('not found');

    if (isNotFound) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    trackException(error, { endpoint: '/api/invoice/:invoiceId', invoiceId, adminEmail: user.email });
    return res.status(500).json({ error: 'Failed to update invoice.' });
  }
});

app.delete('/api/invoice/:invoiceId', customJwtCheck, async (req: any, res) => {
  const { invoiceId } = req.params;
  const user = getUserFromCustomToken(req);

  if (!user) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!user.siteAdmin) {
    return res.status(403).json({ error: 'Access denied: Admin only' });
  }

  try {
    const result = await deleteInvoice(invoiceId);
    trackEvent('DeleteInvoice_API_Success', { invoiceId, adminEmail: user.email });
    return res.status(200).json(result);
  } catch (error: any) {
    const isNotFound = String(error?.message || '').toLowerCase().includes('not found');
    if (isNotFound) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }
    trackException(error, { endpoint: 'DELETE /api/invoice/:invoiceId', invoiceId, adminEmail: user.email });
    return res.status(500).json({ error: 'Failed to delete invoice.' });
  }
});

app.post('/api/register', registerLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await registerUser(email, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/approveUser', async (req, res) => {
  try {
    const { email } = req.body;
    // Only allow if the requester is an admin
    const token = req.headers.authorization?.split(' ')[1];

    trackEvent('ApproveUser_API_Attempt', { email });

    const result = await approveUser(email, token);
    res.json(result);
  }
  catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/unapproveUser', async (req, res) => {
  try {
    const { email } = req.body;
    // Only allow if the requester is an admin
    const token = req.headers.authorization?.split(' ')[1];

    trackEvent('UnapproveUser_API_Attempt', { email });

    const result = await unapproveUser(email, token);
    res.json(result);
  }
  catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/toggleAdmin', async (req, res) => {
  try {
    const { email } = req.body;
    // Only allow if the requester is an admin
    const token = req.headers.authorization?.split(' ')[1];

    trackEvent('ToggleAdmin_API_Attempt', { email });

    const result = await toggleAdmin(email, token);
    res.json(result);
  }
  catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const { token } = await loginUser(email, password);
    res.json({ token });
  } catch (err) {
    trackException(err, { email: req.body.email });
    console.log(err);
    res.status(401).json({ error: err.message });
  }
});

app.get('/api/protected', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = verifyToken(token || '');

  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  res.json({ message: `Welcome ${user.email}` });
});

app.post('/api/invoice/create-payment-intent', async (req, res) => {
  const { invoiceId } = req.body;

  if (!invoiceId) {
    return res.status(400).json({ error: 'Missing invoiceId' });
  }

  try {
    const invoice = await getInvoiceDetails(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status.toUpperCase() === IInvoiceStatus.CANCELLED.toUpperCase()) {
      return res.status(400).json({ error: 'Invoice is cancelled' });
    }
    if (invoice.status.toUpperCase() === IInvoiceStatus.PAID.toUpperCase()) {
      return res.status(400).json({ error: 'Invoice is already paid' });
    }

    // Server-side: Use the full invoice amount (not client-provided)
    const amount = invoice.amount;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: { 
        invoiceId,
        clientId: invoice.clientId || invoice.partitionKey || 'unknown',
      },
      automatic_payment_methods: { enabled: true },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    console.error('Stripe error:', err);
    trackException(err, { invoiceId });
    res.status(500).json({ error: 'Failed to create payment intent' + err.message });
  }
});

app.post('/api/table-warmer', async (req, res) => {
  const start = Date.now();

  try {
    const entities: IWarmerEntity[] = await queryEntities(TableNames.Warmer, null);

    if (!entities || entities.length === 0) {
      console.warn('Table warmer: no entities found');
      return res.status(404).json({ error: "No warmer entity found." });
    }

    const warmerEntity: IWarmerEntity = entities[0];

    if (!warmerEntity.partitionKey || !warmerEntity.rowKey) {
      throw new Error(`Invalid warmer entity: missing PartitionKey/RowKey`);
    }

    const updatedEntity: IWarmerEntity = {
      ...warmerEntity,
      lastPing: new Date(), // add a field to simulate activity
    };

    await updateEntity(TableNames.Warmer, updatedEntity);

    const duration = Date.now() - start;
    console.log(`Table warmer updated in ${duration}ms`);
    trackEvent('TableWarmer_Success', { duration });

    return res.json({ message: "Table warmer pinged successfully", duration });
  } catch (error: any) {
    console.error('Table warmer failed:', error);
    trackEvent('TableWarmer_Failure', { error: error.message });

    return res.status(500).json({ error: "Table warmer failed.", details: error.message });
  }
});

// Client Management Routes
app.post('/api/client', customJwtCheck, async (req, res) => {
  try {
    const { clientId, clientName, contactEmail, address, phone } = req.body;

    if (!clientId || !clientName || !contactEmail) {
      return res.status(400).json({ error: 'Missing required fields: clientId, clientName, contactEmail' });
    }

    const client = await addClient(clientId, clientName, contactEmail, address || '', phone || '');
    trackEvent('CreateClient_Success', { clientId });
    res.status(201).json(client);
  } catch (err: any) {
    console.error('Error creating client:', err);
    trackException(err, { clientId: req.body.clientId });
    res.status(500).json({ error: 'Failed to create client.' });
  }
});

app.get('/api/clients', authCheck, async (req: any, res) => {
  try {
    // API key requests (from scheduled jobs) get all clients
    if (req.apiKeyAuthenticated) {
      const clients = await getAllClients();
      return res.json(clients);
    }

    const user = getUserFromCustomToken(req);
    
    if (!user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Site admins can see all clients
    if (user.siteAdmin) {
      const clients = await getAllClients();
      res.json(clients);
    } else {
      // Regular users only see their own client
      const client = await getClientById(user.clientId);
      res.json(client ? [client] : []);
    }
  } catch (err: any) {
    console.error('Error fetching clients:', err);
    trackException(err, { endpoint: '/api/clients' });
    res.status(500).json({ error: 'Failed to fetch clients.' });
  }
});

app.get('/api/client/:clientId', customJwtCheck, async (req: any, res) => {
  try {
    const { clientId } = req.params;
    const user = getUserFromCustomToken(req);
    
    if (!user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Users can only access their own client unless they're admin
    if (!user.siteAdmin && user.clientId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const client = await getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (err: any) {
    console.error('Error fetching client:', err);
    trackException(err, { endpoint: '/api/client/:clientId', clientId: req.params.clientId });
    res.status(500).json({ error: 'Failed to fetch client.' });
  }
});

app.get('/api/client/:clientId/invoices', customJwtCheck, async (req: any, res) => {
  try {
    const { clientId } = req.params;
    const user = getUserFromCustomToken(req);
    
    if (!user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Users can only access their own client's invoices unless they're admin
    if (!user.siteAdmin && user.clientId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const invoices = await getInvoicesByClientId(clientId);
    res.json(invoices);
  } catch (err: any) {
    console.error('Error fetching client invoices:', err);
    trackException(err, { endpoint: '/api/client/:clientId/invoices' });
    res.status(500).json({ error: 'Failed to fetch client invoices.' });
  }
});

app.get('/api/admin/client-tenants', authCheck, async (req: any, res) => {
  try {
    if (req.apiKeyAuthenticated) {
      const tenants = await getAllClientTenants();
      return res.json(tenants.filter((item: any) => item.active !== false));
    }

    const user = getUserFromCustomToken(req);
    if (!user || !user.siteAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }

    const tenants = await getAllClientTenants();
    return res.json(tenants);
  } catch (err: any) {
    console.error('Error fetching client tenants:', err);
    trackException(err, { endpoint: '/api/admin/client-tenants' });
    return res.status(500).json({ error: 'Failed to fetch client tenants.' });
  }
});

app.get('/api/admin/client/:clientId/tenants', authCheck, async (req: any, res) => {
  try {
    const { clientId } = req.params;

    if (!req.apiKeyAuthenticated) {
      const user = getUserFromCustomToken(req);
      if (!user || !user.siteAdmin) {
        return res.status(403).json({ error: 'Access denied: Admin only' });
      }
    }

    const tenants = await getClientTenants(clientId);
    return res.json(req.apiKeyAuthenticated ? tenants.filter((item: any) => item.active !== false) : tenants);
  } catch (err: any) {
    console.error('Error fetching client tenant mappings:', err);
    trackException(err, { endpoint: '/api/admin/client/:clientId/tenants', clientId: req.params.clientId });
    return res.status(500).json({ error: 'Failed to fetch client tenant mappings.' });
  }
});

app.post('/api/admin/client/:clientId/tenants', customJwtCheck, async (req: any, res) => {
  try {
    const { clientId } = req.params;
    const user = getUserFromCustomToken(req);

    if (!user || !user.siteAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }

    const { tenantId, tenantName, graphClientId, active } = req.body;

    if (!tenantId || !graphClientId) {
      return res.status(400).json({
        error: 'Missing required fields: tenantId, graphClientId',
      });
    }

    const client = await getClientById(clientId);

    const mapping = await addOrUpdateClientTenant(
      clientId,
      tenantId,
      tenantName,
      graphClientId,
      client?.name,
      active !== false,
    );

    trackEvent('ClientTenant_Upsert_Success', { clientId, tenantId });
    return res.status(201).json(mapping);
  } catch (err: any) {
    console.error('Error saving client tenant mapping:', err);
    trackException(err, { endpoint: '/api/admin/client/:clientId/tenants', clientId: req.params.clientId });
    return res.status(500).json({ error: err?.message || 'Failed to save client tenant mapping.' });
  }
});

app.delete('/api/admin/client/:clientId/tenants/:tenantId', customJwtCheck, async (req: any, res) => {
  try {
    const { clientId, tenantId } = req.params;
    const user = getUserFromCustomToken(req);

    if (!user || !user.siteAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }

    await deleteClientTenant(clientId, tenantId);
    trackEvent('ClientTenant_Delete_Success', { clientId, tenantId });
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting client tenant mapping:', err);
    trackException(err, {
      endpoint: '/api/admin/client/:clientId/tenants/:tenantId',
      clientId: req.params.clientId,
      tenantId: req.params.tenantId,
    });
    return res.status(500).json({ error: 'Failed to delete client tenant mapping.' });
  }
});

app.get('/api/admin/dashboard/:clientId', customJwtCheck, async (req: any, res) => {
  try {
    const { clientId } = req.params;
    const user = getUserFromCustomToken(req);

    if (!user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!user.siteAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }

    const client = await getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const [invoices, users, warmerEntities] = await Promise.all([
      getInvoicesByClientId(clientId),
      queryEntities(TableNames.Users, null),
      queryEntities(TableNames.Warmer, null),
    ]);

    const clientUsers = users
      .filter((entry: any) => entry?.clientId === clientId)
      .map((entry: any) => {
        const { hash, salt, ...rest } = entry || {};
        return rest;
      });

    const warmerEntity = warmerEntities.length > 0 ? warmerEntities[0] as IWarmerEntity : null;
    const lastPingValue = warmerEntity?.lastPing ? new Date(warmerEntity.lastPing) : null;
    const lastPingIso = lastPingValue && !Number.isNaN(lastPingValue.getTime())
      ? lastPingValue.toISOString()
      : null;
    const minutesSinceLastPing = lastPingValue
      ? Math.floor((Date.now() - lastPingValue.getTime()) / 60000)
      : null;

    const normalizeStatus = (status: any): string => String(status || '').trim().toUpperCase();
    const isPaid = (invoice: any): boolean => normalizeStatus(invoice?.status) === IInvoiceStatus.PAID;
    const isCancelled = (invoice: any): boolean => normalizeStatus(invoice?.status) === IInvoiceStatus.CANCELLED;

    const totalBilled = invoices.reduce((sum: number, invoice: any) => sum + (Number(invoice.amount) || 0), 0);
    const paidInvoices = invoices.filter((invoice: any) => isPaid(invoice));
    const cancelledInvoices = invoices.filter((invoice: any) => isCancelled(invoice));
    const activeInvoices = invoices.filter((invoice: any) => !isCancelled(invoice));
    const outstandingInvoices = invoices.filter((invoice: any) => !isPaid(invoice) && !isCancelled(invoice));
    const totalPaid = paidInvoices.reduce((sum: number, invoice: any) => sum + (Number(invoice.amount) || 0), 0);
    const totalOutstanding = outstandingInvoices.reduce((sum: number, invoice: any) => sum + (Number(invoice.amount) || 0), 0);

    res.json({
      client,
      users: clientUsers,
      invoices,
      metrics: {
        invoiceCount: invoices.length,
        activeInvoiceCount: activeInvoices.length,
        paidInvoiceCount: paidInvoices.length,
        cancelledInvoiceCount: cancelledInvoices.length,
        outstandingInvoiceCount: outstandingInvoices.length,
        userCount: clientUsers.length,
        approvedUserCount: clientUsers.filter((entry: any) => entry.approved).length,
        pendingUserCount: clientUsers.filter((entry: any) => !entry.approved).length,
        totalBilled,
        totalPaid,
        totalOutstanding,
      },
      uptime: {
        apiProcessSeconds: Math.floor(process.uptime()),
        apiStartedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        warmerLastPing: lastPingIso,
        warmerMinutesSinceLastPing: minutesSinceLastPing,
        warmerStatus: minutesSinceLastPing === null ? 'unavailable' : minutesSinceLastPing <= 15 ? 'healthy' : 'stale',
      },
    });
  } catch (err: any) {
    console.error('Error fetching admin dashboard data:', err);
    trackException(err, { endpoint: '/api/admin/dashboard/:clientId', clientId: req.params.clientId });
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

// Domain management endpoints
app.get('/api/admin/client/:clientId/domains', authCheck, async (req: any, res) => {
  try {
    const { clientId } = req.params;
    const user = getUserFromCustomToken(req);

    if (!req.apiKeyAuthenticated && (!user || !user.siteAdmin)) {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }

    const domains = await getClientDomains(clientId);
    res.json(domains);
  } catch (err: any) {
    console.error('Error fetching client domains:', err);
    trackException(err, { endpoint: '/api/admin/client/:clientId/domains', clientId: req.params.clientId });
    res.status(500).json({ error: 'Failed to fetch domains.' });
  }
});

app.post('/api/admin/client/:clientId/domains', customJwtCheck, async (req: any, res) => {
  try {
    const { clientId } = req.params;
    const { domain } = req.body;
    const user = getUserFromCustomToken(req);

    if (!user || !user.siteAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const newDomain = await addDomainToClient(clientId, domain);
    res.json(newDomain);
  } catch (err: any) {
    console.error('Error adding domain:', err);
    trackException(err, { endpoint: '/api/admin/client/:clientId/domains', clientId: req.params.clientId });
    const errorMessage = err?.details?.odataError?.message?.value || err?.message || 'Failed to add domain.';
    res.status(500).json({ error: errorMessage });
  }
});

app.delete('/api/admin/client/:clientId/domains/:rowKey', customJwtCheck, async (req: any, res) => {
  try {
    const { clientId, rowKey } = req.params;
    const user = getUserFromCustomToken(req);

    if (!user || !user.siteAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }

    await removeDomain(clientId, rowKey);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error removing domain:', err);
    trackException(err, { endpoint: '/api/admin/client/:clientId/domains/:rowKey', clientId: req.params.clientId });
    res.status(500).json({ error: 'Failed to remove domain.' });
  }
});

// Domain health check endpoints
app.get('/api/admin/domain-health/:clientId', customJwtCheck, async (req: any, res) => {
  try {
    const { clientId } = req.params;
    const user = getUserFromCustomToken(req);

    if (!user || !user.siteAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }

    const domains = await getClientDomains(clientId);
    const healthChecks = await Promise.all(
      domains.map(async (d) => ({
        domain: d.domain,
        rowKey: d.rowKey,
        health: await getLatestDomainHealthCheck(clientId, d.domain),
      }))
    );

    res.json(healthChecks);
  } catch (err: any) {
    console.error('Error fetching domain health:', err);
    trackException(err, { endpoint: '/api/admin/domain-health/:clientId', clientId: req.params.clientId });
    res.status(500).json({ error: 'Failed to fetch domain health.' });
  }
});

app.post('/api/admin/domain-health/:clientId/check/:domain', authCheck, async (req: any, res) => {
  try {
    const { clientId, domain } = req.params;
    const decodedDomain = decodeURIComponent(domain);
    console.log(`[/api/admin/domain-health/:clientId/check/:domain] Starting check for domain=${decodedDomain}, clientId=${clientId}`);
    
    const user = getUserFromCustomToken(req);
    const isApiKeyAuth = req.apiKeyAuthenticated;

    // Allow if: (user is authenticated and admin) OR (API key authenticated)
    if (!isApiKeyAuth && (!user || !user.siteAdmin)) {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }

    console.log(`[/api/admin/domain-health/:clientId/check/:domain] Calling performDomainHealthCheck...`);
    const health = await performDomainHealthCheck(clientId, decodedDomain);
    console.log(`[/api/admin/domain-health/:clientId/check/:domain] Check complete, returning result`);
    res.json(health);
  } catch (err: any) {
    const errorId = `dh-${Date.now()}`;
    console.error('Error checking domain health:', err);
    console.error('Full error stack:', err?.stack);
    trackException(err, {
      endpoint: '/api/admin/domain-health/:clientId/check/:domain',
      clientId: req.params.clientId,
      domain: req.params.domain,
      errorId,
    });
    res.status(500).json({
      error: 'Failed to check domain health.',
      errorId,
      details: err?.message || 'Unknown server error',
    });
  }
});

interface IHealthReportDomain {
  clientName: string;
  domain: string;
  websiteStatus: string;
  websiteError?: string;
  emailStatus: string;
  emailError?: string;
}

interface IHealthReportPayload {
  isDailyReport: boolean;
  totalDomains: number;
  domainsDown: number;
  results: IHealthReportDomain[];
}

interface ILicenseSkuDetail {
  skuId: string;
  skuPartNumber: string;
  clientId?: string;
  clientName?: string;
  tenantId?: string;
  tenantName?: string;
  totalUnits: number;
  consumedUnits: number;
  availableUnits: number;
  availablePercent?: number;
  unusedUnits: number;
  capabilityStatus: string;
  expiration: string;
  autoRenew?: boolean | null;
}

interface ILicenseUserDetail {
  clientId?: string;
  clientName?: string;
  tenantId?: string;
  tenantName?: string;
  displayName: string;
  userPrincipalName: string;
}

interface ILicenseReportPayload {
  generatedAtUtc: string;
  trigger?: string;
  sendEmail?: boolean;
  emailRecipients?: string[];
  summary: {
    skuCount: number;
    totalUnits: number;
    consumedUnits: number;
    availableUnits: number;
    unlicensedUserCount: number;
    lowAvailabilitySkuCount: number;
    tenantCount?: number;
    unusedThreshold: number;
    unusedPercentThreshold?: number;
    expirationSource: string;
  };
  lowAvailabilitySkus: Array<{
    sku: string;
    available: number;
    total: number;
    consumed: number;
    availablePercent?: number;
  }>;
  skuDetails: ILicenseSkuDetail[];
  unlicensedUsers: ILicenseUserDetail[];
}

app.post('/api/admin/send-health-report', authCheck, async (req: any, res) => {
  try {
    const { isDailyReport, totalDomains, domainsDown, results } = req.body as IHealthReportPayload;

    if (!Array.isArray(results)) {
      return res.status(400).json({ error: 'Missing results array.' });
    }

    const reportDate = new Date().toUTCString();
    const subject = isDailyReport
      ? `[Daily Report] Domain Health Summary — ${new Date().toDateString()}`
      : `[ALERT] ${domainsDown} Domain(s) Down — ${new Date().toDateString()}`;

    const statusIcon = (s: string) =>
      s?.toLowerCase() === 'healthy' ? '✅' : '❌';

    const rows = results.map((r) => {
      const webIcon = statusIcon(r.websiteStatus);
      const emailIcon = statusIcon(r.emailStatus);
      const webDetail = r.websiteStatus?.toLowerCase() !== 'healthy' && r.websiteError
        ? `<br/><small style="color:#999">${r.websiteError}</small>` : '';
      const emailDetail = r.emailStatus?.toLowerCase() !== 'healthy' && r.emailError
        ? `<br/><small style="color:#999">${r.emailError}</small>` : '';
      const rowStyle = r.websiteStatus?.toLowerCase() !== 'healthy' || r.emailStatus?.toLowerCase() !== 'healthy'
        ? 'background:#fff3f3' : '';
      return `<tr style="${rowStyle}">
        <td style="padding:8px;border:1px solid #ddd">${r.clientName}</td>
        <td style="padding:8px;border:1px solid #ddd">${r.domain}</td>
        <td style="padding:8px;border:1px solid #ddd">${webIcon}${webDetail}</td>
        <td style="padding:8px;border:1px solid #ddd">${emailIcon}${emailDetail}</td>
      </tr>`;
    }).join('');

    const summary = domainsDown === 0
      ? `<p style="color:green">All ${totalDomains} domain(s) are healthy.</p>`
      : `<p style="color:red"><strong>${domainsDown} of ${totalDomains} domain(s) have issues.</strong></p>`;

    const html = `
      <h2 style="font-family:sans-serif">Domain Health Report</h2>
      <p style="font-family:sans-serif;color:#666">Generated: ${reportDate}</p>
      ${summary}
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;width:100%;max-width:700px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Client</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Domain</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Website</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Email / MX</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-family:sans-serif;color:#999;font-size:12px;margin-top:24px">Rudyard Technologies Automated Health Monitor</p>
    `;

    const text = [
      `Domain Health Report — ${reportDate}`,
      `${domainsDown === 0 ? `All ${totalDomains} domain(s) healthy.` : `${domainsDown}/${totalDomains} domain(s) have issues.`}`,
      '',
      ...results.map((r) =>
        `${r.domain} (${r.clientName}): website=${r.websiteStatus}${r.websiteError ? ` (${r.websiteError})` : ''}, email=${r.emailStatus}${r.emailError ? ` (${r.emailError})` : ''}`
      ),
    ].join('\n');

    await sendEmail({
      to: 'info@rudyardtechnologies.com',
      subject,
      html,
      text,
      sent: true,
    });

    trackEvent('HealthReport_Sent', {
      isDailyReport: String(isDailyReport),
      totalDomains: String(totalDomains),
      domainsDown: String(domainsDown),
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error sending health report email:', err);
    trackException(err, { endpoint: '/api/admin/send-health-report' });
    res.status(500).json({ error: 'Failed to send health report.' });
  }
});

app.post('/api/admin/send-license-report', authCheck, async (req: any, res) => {
  try {
    const {
      generatedAtUtc,
      trigger,
      sendEmail: sendEmailRequested,
      emailRecipients,
      summary,
      lowAvailabilitySkus,
      skuDetails,
      unlicensedUsers,
    } = req.body as ILicenseReportPayload;

    if (!summary || !Array.isArray(skuDetails) || !Array.isArray(unlicensedUsers)) {
      return res.status(400).json({ error: 'Invalid license report payload.' });
    }

    const reportDate = new Date(generatedAtUtc || Date.now()).toUTCString();
    const subjectPrefix = summary.lowAvailabilitySkuCount > 0 ? '[ALERT]' : '[Daily Report]';
    const subject = `${subjectPrefix} M365 License Summary — ${new Date().toDateString()}`;
    const recipients = Array.isArray(emailRecipients) && emailRecipients.length > 0
      ? emailRecipients
      : ['info@rudyardtechnologies.com'];

    const getExpirationDate = (rawExpiration?: string): Date | null => {
      if (!rawExpiration || rawExpiration === 'unknown') {
        return null;
      }

      // Expiration may include extra status text, so parse only the first token.
      const firstToken = rawExpiration.split(' ')[0];
      const parsed = new Date(firstToken);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const isWithinNextTwoMonths = (rawExpiration?: string): boolean => {
      const expiry = getExpirationDate(rawExpiration);
      if (!expiry) {
        return false;
      }

      const now = new Date();
      const twoMonthsFromNow = new Date(now);
      twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
      return expiry >= now && expiry <= twoMonthsFromNow;
    };

    const formatExpirationDate = (rawExpiration?: string): string => {
      const expDate = getExpirationDate(rawExpiration);
      if (!expDate) return 'unknown';
      const mm = String(expDate.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(expDate.getUTCDate()).padStart(2, '0');
      const yyyy = expDate.getUTCFullYear();
      return `${mm}-${dd}-${yyyy}`;
    };

    const extractStatus = (rawExpiration?: string): string => {
      if (!rawExpiration || rawExpiration === 'unknown') return '-';
      const match = rawExpiration.match(/\(status=([^)]+)\)/i);
      return match ? match[1] : '-';
    };

    const skuRows = skuDetails.map((s) => {
      const hasUnusedLicenses = s.availableUnits > 0;
      const expiresSoon = isWithinNextTwoMonths(s.expiration);
      const rowStyle = expiresSoon
        ? 'background:#ffd9d9'
        : hasUnusedLicenses
          ? 'background:#ffe9cc'
          : '';
      const unusedPercent = typeof s.availablePercent === 'number'
        ? `${Number(s.availablePercent).toFixed(2)}%`
        : 'n/a';
      const expirationDisplay = formatExpirationDate(s.expiration);
      const statusDisplay = extractStatus(s.expiration);
      const autoRenewDisplay = s.autoRenew === true ? 'Yes' : s.autoRenew === false ? 'No' : '-';

      return `<tr style="${rowStyle}">
        <td style="padding:8px;border:1px solid #ddd">${s.clientName || s.clientId || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd">${s.tenantName || s.tenantId || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd">${s.skuPartNumber}</td>
        <td style="padding:8px;border:1px solid #ddd">${s.totalUnits}</td>
        <td style="padding:8px;border:1px solid #ddd">${s.consumedUnits}</td>
        <td style="padding:8px;border:1px solid #ddd">${unusedPercent}</td>
        <td style="padding:8px;border:1px solid #ddd">${expirationDisplay}</td>
        <td style="padding:8px;border:1px solid #ddd">${statusDisplay}</td>
        <td style="padding:8px;border:1px solid #ddd">${autoRenewDisplay}</td>
      </tr>`;
    }).join('');

    const unlicensedRows = unlicensedUsers.map((u) =>
      `<tr>
        <td style="padding:8px;border:1px solid #ddd">${u.clientName || u.clientId || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd">${u.tenantName || u.tenantId || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd">${u.displayName}</td>
        <td style="padding:8px;border:1px solid #ddd">${u.userPrincipalName}</td>
      </tr>`
    ).join('');

    const lowSkuSummary = Array.isArray(lowAvailabilitySkus) && lowAvailabilitySkus.length > 0
      ? `<p style="color:red"><strong>${lowAvailabilitySkus.length} SKU(s) are at or below thresholds (available <= ${summary.unusedThreshold}${typeof summary.unusedPercentThreshold === 'number' ? ` OR available% <= ${summary.unusedPercentThreshold}%` : ''}).</strong></p>`
      : `<p style="color:green">No SKUs are currently below threshold rules (available <= ${summary.unusedThreshold}${typeof summary.unusedPercentThreshold === 'number' ? ` OR available% <= ${summary.unusedPercentThreshold}%` : ''}).</p>`;

    const html = `
      <h2 style="font-family:sans-serif">Microsoft 365 License Report</h2>
      <p style="font-family:sans-serif;color:#666">Generated: ${reportDate}</p>
      <p style="font-family:sans-serif;color:#666">Trigger: ${trigger || 'timer'} | Email send requested: ${String(sendEmailRequested ?? true)}</p>
      <p style="font-family:sans-serif">Tenants monitored: <strong>${summary.tenantCount ?? 'n/a'}</strong></p>
      <p style="font-family:sans-serif">SKUs: <strong>${summary.skuCount}</strong> | Total: <strong>${summary.totalUnits}</strong> | Consumed: <strong>${summary.consumedUnits}</strong> | Available: <strong>${summary.availableUnits}</strong></p>
      <p style="font-family:sans-serif">Users missing licenses (sample): <strong>${summary.unlicensedUserCount}</strong></p>
      ${lowSkuSummary}
      <p style="font-family:sans-serif;color:#666">Expiration source: ${summary.expirationSource || 'unknown'}</p>

      <h3 style="font-family:sans-serif;margin-top:20px">SKU Details</h3>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;width:100%;max-width:900px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Client</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Tenant</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">SKU</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Total</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Consumed</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Unused %</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Expiration</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Status</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Auto-Renew</th>
          </tr>
        </thead>
        <tbody>${skuRows}</tbody>
      </table>

      <h3 style="font-family:sans-serif;margin-top:20px">Users Missing Licenses</h3>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;width:100%;max-width:900px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Client</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Tenant</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Display Name</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">User Principal Name</th>
          </tr>
        </thead>
        <tbody>${unlicensedRows || '<tr><td colspan="2" style="padding:8px;border:1px solid #ddd">No unlicensed users in sampled set.</td></tr>'}</tbody>
      </table>

      <p style="font-family:sans-serif;color:#999;font-size:12px;margin-top:24px">Rudyard Technologies Automated License Monitor</p>
    `;

    const text = [
      `Microsoft 365 License Report — ${reportDate}`,
      `SKUs: ${summary.skuCount} | Total: ${summary.totalUnits} | Consumed: ${summary.consumedUnits} | Available: ${summary.availableUnits}`,
      `Users missing licenses (sample): ${summary.unlicensedUserCount}`,
      `Low availability SKUs: ${summary.lowAvailabilitySkuCount}`,
      `Tenants monitored: ${summary.tenantCount ?? 'n/a'}`,
      `Thresholds: available <= ${summary.unusedThreshold}${typeof summary.unusedPercentThreshold === 'number' ? ` OR available% <= ${summary.unusedPercentThreshold}%` : ''}`,
      `Trigger: ${trigger || 'timer'} | Email send requested: ${String(sendEmailRequested ?? true)}`,
      `Expiration source: ${summary.expirationSource || 'unknown'}`,
      '',
      'SKU Details:',
      ...skuDetails.map((s) =>
        `${s.clientName || s.clientId || '-'} / ${s.tenantName || s.tenantId || '-'} / ${s.skuPartNumber}: total=${s.totalUnits}, consumed=${s.consumedUnits}, available=${s.availableUnits}, expiration=${s.expiration || 'unknown'}`
      ),
      '',
      'Users Missing Licenses (sample):',
      ...unlicensedUsers.map((u) => `${u.clientName || u.clientId || '-'} / ${u.tenantName || u.tenantId || '-'} / ${u.displayName} <${u.userPrincipalName}>`),
    ].join('\n');

    await sendEmail({
      to: recipients.join(','),
      subject,
      html,
      text,
      sent: true,
    });

    trackEvent('LicenseReport_Sent', {
      skuCount: String(summary.skuCount),
      unlicensedUserCount: String(summary.unlicensedUserCount),
      lowAvailabilitySkuCount: String(summary.lowAvailabilitySkuCount),
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error sending license report email:', err);
    trackException(err, { endpoint: '/api/admin/send-license-report' });
    res.status(500).json({ error: 'Failed to send license report.' });
  }
});

app.delete('/api/client/:clientId/:contactEmail', customJwtCheck, async (req: any, res) => {
  try {
    const { clientId, contactEmail } = req.params;
    const user = getUserFromCustomToken(req);
    
    if (!user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only site admins can delete clients
    if (!user.siteAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }

    await deleteClient(clientId, contactEmail);
    trackEvent('DeleteClient_Success', { clientId });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting client:', err);
    trackException(err, { endpoint: '/api/client/:clientId/:contactEmail', clientId: req.params.clientId });
    res.status(500).json({ error: 'Failed to delete client.' });
  }
});

app.get('/api/users', customJwtCheck, async (req: any, res) => {
  try {
    const user = getUserFromCustomToken(req);
    
    if (!user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only site admins can view all users
    if (!user.siteAdmin) {
      return res.status(403).json({ error: 'Access denied: Admin only' });
    }

    const [users, clients] = await Promise.all([
      queryEntities(TableNames.Users, null),
      getAllClients()
    ]);

    // Create a map of clientId -> clientName for quick lookup
    const clientMap = new Map(clients.map((c: any) => [c.id, c.name]));

    const safeUsers = users.map((u: any) => {
      const { hash, salt, ...rest } = u || {};
      return {
        ...rest,
        clientName: clientMap.get(rest.clientId) || null
      };
    });
    res.json(safeUsers);
  } catch (err: any) {
    trackException(err, { endpoint: '/api/users' });
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// JWT error handler - handles authentication errors
app.use(jwtErrorHandler);

// Global error handler - catches unhandled errors
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err.message, err.stack);
  trackException(err, {
    endpoint: req.path,
    method: req.method,
    errorMessage: err.message,
    errorStack: err.stack
  });
  
  // Don't leak error details in production
  const errorResponse = process.env.NODE_ENV === 'production'
    ? { error: 'Internal server error' }
    : { error: err.message, stack: err.stack };
    
  res.status(err.status || 500).json(errorResponse);
});

// Export app for testing and start server when run directly
export default app;

if (require.main === module) {
  // Log startup configuration
  console.log('=== Server Configuration ===');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('AZURE_TENANT_ID:', process.env.AZURE_TENANT_ID ? 'configured' : 'MISSING');
  console.log('RUDYARD_CLIENT_APP_REG_AZURE_CLIENT_ID:', process.env.RUDYARD_CLIENT_APP_REG_AZURE_CLIENT_ID ? 'configured' : 'MISSING');
  console.log('RUDYARD_STORAGE_ACCOUNT_NAME:', process.env.RUDYARD_STORAGE_ACCOUNT_NAME ? 'configured' : 'MISSING');
  console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL ? 'configured' : 'MISSING');
  console.log('FRONTEND_ORIGIN:', process.env.FRONTEND_ORIGIN || 'not set');
  console.log('============================');
  
  trackEvent('Server_Startup', {
    nodeEnv: process.env.NODE_ENV || 'development',
    hasTenantId: String(!!process.env.AZURE_TENANT_ID),
    hasClientId: String(!!process.env.RUDYARD_CLIENT_APP_REG_AZURE_CLIENT_ID),
    hasStorageAccount: String(!!process.env.RUDYARD_STORAGE_ACCOUNT_NAME)
  });

  // Migrate existing domains to normalize format (e.g., https://example.com/ -> example.com)
  async function migrateDomainNormalization() {
    try {
      console.log('Starting domain normalization migration...');
      const allDomains: any[] = await queryEntities(TableNames.Domains, null);
      let updated = 0;
      
      for (const domain of allDomains) {
        if (domain.domain && domain.domain.includes('://')) {
          // This domain needs normalization
          const normalized = domain.domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
          if (normalized !== domain.domain) {
            domain.domain = normalized;
            try {
              await updateEntity(TableNames.Domains, domain);
              updated++;
            } catch (err: any) {
              console.warn(`Failed to normalize domain ${domain.domain}:`, err.message);
            }
          }
        }
      }
      
      if (updated > 0) {
        console.log(`✓ Normalized ${updated} domains`);
        trackEvent('DomainMigration_Complete', { normalizedCount: String(updated) });
      } else {
        console.log('✓ All domains already normalized');
      }
    } catch (err: any) {
      console.error('Domain normalization migration failed:', err.message);
      // Don't fail startup, just log the error
    }
  }

  // Run migration before starting server
  migrateDomainNormalization().then(() => {
    app.listen(PORT, () => {
      console.log(`Rudyard Technologies server is live at http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error('Failed to complete startup migrations:', err);
    process.exit(1);
  });
}