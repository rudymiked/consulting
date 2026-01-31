import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import appInsights from "applicationinsights";
import { insertIntoContactLogs, sendEmail } from './emailHelper';
import jwksClient from 'jwks-rsa';
import { expressjwt } from 'express-jwt';
import { createInvoice, finalizePayment, getInvoiceDetails, getInvoices, payInvoice } from './invoiceHelper';
import { trackEvent, trackException } from './telemetry';
import { approveUser, loginUser, registerUser, verifyToken } from './authHelper';
import { IEmailOptions, IInvoice, IInvoiceResult, IInvoiceStatus, IWarmerEntity, TableNames } from './models';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';
import { queryEntities, updateEntity } from './tableClientHelper';
import { addClient, deleteClient, getAllClients, getClientByEmail, getClientById, getClientsByName, getInvoicesByClientId } from './clientHelper';

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
  res.send('Welcome to the Rudyard Software Consulting API');
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
        text = `${invoice.name},\n\nWe have received your partial payment of $${paidDollars} for Invoice ${invoiceId} (Total Amount: $${invoice.amount}).\n\nThank you for your business!\n\nBest regards,\nRudyard Software Consulting`;
        html = `<p>${invoice.name},</p><p>We have received your partial payment of <strong>$${paidDollars}</strong> for Invoice <strong>${invoiceLinkHTML}</strong> (Total Amount: <strong>$${invoice.amount}</strong>).</p><p>Thank you for your business!</p><p>Best regards,<br/>Rudyard Software Consulting</p>`;
      } else if (isOverPaid) {
        text = `${invoice.name},\n\nWe have received your payment of $${paidDollars} for Invoice ${invoiceId}, which exceeds the total amount due ($${invoice.amount}).\n\nWe will contact you regarding the overpayment.\n\nThank you for your business!\n\nBest regards,\nRudyard Software Consulting`;
        html = `<p>${invoice.name},</p><p>We have received your payment of <strong>$${paidDollars}</strong> for Invoice <strong>${invoiceLinkHTML}</strong>, which exceeds the total amount due (<strong>$${invoice.amount}</strong>).</p><p>We will contact you regarding the overpayment.</p><p>Thank you for your business!</p><p>Best regards,<br/>Rudyard Software Consulting</p>`;
      } else {
        text = `${invoice.name},\n\nWe have received your payment for Invoice ${invoiceId} amounting to $${paidDollars}.\n\nThank you for your business!\n\nBest regards,\nRudyard Software Consulting`;
        html = `<p>${invoice.name},</p><p>We have received your payment for Invoice <strong>${invoiceLinkHTML}</strong> amounting to <strong>$${paidDollars}</strong>.</p><p>Thank you for your business!</p><p>Best regards,<br/>Rudyard Software Consulting</p>`;
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

app.post('/api/register', async (req, res) => {
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

app.post('/api/login', async (req, res) => {
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
  const { invoiceId, amount } = req.body;

  if (!invoiceId || !amount) {
    return res.status(400).json({ error: 'Missing invoiceId or amount' });
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

    if (typeof amount !== 'number' || amount <= 0 || amount > invoice.amount) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: { invoiceId },
      automatic_payment_methods: { enabled: true },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    console.error('Stripe error:', err);
    trackException(err, { invoiceId, amount });
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

app.get('/api/clients', customJwtCheck, async (req: any, res) => {
  try {
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

    const users = await queryEntities(TableNames.Users, null);
    const safeUsers = users.map((u: any) => {
      const { hash, salt, ...rest } = u || {};
      return rest;
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

  app.listen(PORT, () => {
    console.log(`Rudyard Software Consulting server is live at http://localhost:${PORT}`);
  });
}