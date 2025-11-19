import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as appInsights from 'applicationinsights';
import { IEmailOptions, insertIntoContactLogs, sendEmail } from './emailHelper';
import jwksClient from 'jwks-rsa';
import { expressjwt } from 'express-jwt';
import { createInvoice, getInvoiceDetails, getInvoices, payInvoice } from './invoiceHelper';
import { trackEvent, trackException } from './telemetry';
import { approveUser, loginUser, registerUser, verifyToken } from './authHelper';
import { IInvoice, IInvoiceResult, IInvoiceStatus, IWarmerEntity } from './models';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';
import { queryEntities, updateEntity } from './tableClientHelper';

dotenv.config();

(() => {
  const conn = process.env.APPINSIGHTS_CONNECTION_STRING;

  if (!conn) {
    console.log('Application Insights not configured (no connection string or instrumentation key).');
    return;
  }

  try {
    appInsights.setup(conn)
      .setAutoCollectRequests(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, true)
      .setAutoCollectExceptions(true)
      .setAutoDependencyCorrelation(true)
      .start();

    // Tag role for clarity in App Insights
    const client = appInsights.defaultClient;

    if (client && client.context && client.context.tags) {
      const roleKey = client.context.keys.cloudRole as string;
      client.context.tags[roleKey] = process.env.APPINSIGHTS_ROLE_NAME || 'rudyard-api';
    }
  } catch (err: any) {
    console.error('Failed to initialize Application Insights:', err?.message || err);
  }
})();

const app = express();
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

// Middleware
// Allow CORS from localhost:3000 (dev) and other allowed origins. Also ensure preflight (OPTIONS) is handled.
const corsOptions = {
  origin: (origin: any, callback: any) => {
    // allow requests with no origin (like mobile apps, curl) or from localhost during development
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://' + process.env.FRONTEND_ORIGIN, // optional, set in env for production
      'https://www' + process.env.FRONTEND_ORIGIN
    ].filter(Boolean) as string[];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For stricter security, replace the next line with: callback(new Error('Not allowed by CORS'))
      callback(null, true);
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

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api/', apiLimiter);

// 🔑 JWT Validation Setup
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`
});

async function getSigningKey(header: any): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        reject(err);
      } else {
        const signingKey = key?.getPublicKey();
        if (typeof signingKey === 'string') {
          resolve(signingKey);
        } else {
          reject(new Error('Signing key is undefined'));
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

// Routes

app.get('/', (_, res) => {
  res.send('Welcome to the Rudyard Software Consulting API 🚀');
});

app.get('/api', (_, res) => {
  console.log('API is running 🚀');
  res.send('API is running 🚀');
});

app.post('/api/contact', async (req, res) => {
  const { to, subject, text, html } = req.body;
  const options: IEmailOptions = { to, subject, text, html, sent: false };

  try {
    await insertIntoContactLogs(options);
    trackEvent('InsertContactLog_API', { to, subject });
    res.status(200).json({ message: 'Contacted successfully' });
  } catch (error: any) {
    console.error('Error inserting contact log:', error);
    res.status(500).json({ error: 'Failed to process contact request' });
  }
});

// Protected route example
app.post('/api/sendEmail', jwtCheck, async (req, res) => {
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

app.get('/api/email', (_, res) => {
  console.log('Email address:', process.env.RUDYARD_EMAIL_USERNAME);
  res.json({ message: `email address: ${process.env.RUDYARD_EMAIL_USERNAME}` });
});

app.post('/api/invoice/pay', async (req, res) => {
  const { paymentMethodId, invoiceId, amount } = req.body;

  if (!invoiceId || !amount) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const result: IInvoiceResult = await payInvoice(invoiceId, amount, paymentMethodId);

    if (result.Success) {
      // send email to client confirming payment
      try {
        const invoice = await getInvoiceDetails(invoiceId);
        if (!invoice) {
          throw new Error(`Invoice ${invoiceId} not found for email notification`);
        }
        if (!invoice.contact) {
          throw new Error(`Invoice ${invoiceId} has no contact email for notification`);
        }

        const to = invoice.contact;
        const subject = `Payment Received for Invoice ${invoiceId}`;
        let text = `${invoice.name},\n\nWe have received your payment for Invoice ${invoiceId} amounting to $${amount / 100}.\n\nThank you for your business!\n\nBest regards,\nRudyard Software Consulting`;
        let html = `<p>${invoice.name},</p><p>We have received your payment for Invoice <strong>${invoiceId}</strong> amounting to <strong>$${amount / 100}</strong>.</p><p>Thank you for your business!</p><p>Best regards,<br/>Rudyard Software Consulting</p>`;

        if (invoice.amount !== amount / 100) {
          trackEvent('PartialPayment_Received', { invoiceId, paidAmount: amount, totalAmount: invoice.amount * 100 });

          text = `${invoice.name},\n\nWe have received your partial payment of $${amount / 100} for Invoice ${invoiceId} (Total Amount: $${invoice.amount}).\n\nThank you for your business!\n\nBest regards,\nRudyard Software Consulting`;
          html = `<p>${invoice.name},</p><p>We have received your partial payment of <strong>$${amount / 100}</strong> for Invoice <strong>${invoiceId}</strong> (Total Amount: <strong>$${invoice.amount}</strong>).</p><p>Thank you for your business!</p><p>Best regards,<br/>Rudyard Software Consulting</p>`;
        }

        await sendEmail({ to, subject, text, html, sent: true });
        res.status(200).json({ message: 'Email sent successfully' });
      } catch (error: any) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'Failed to send email: ' + error.message });
      }

      return res.status(200).json({ success: true, message: result.Message });
    } else {
      // Distinguish between client vs server errors
      const statusCode = result.Message.includes('Invalid') ? 400 : 500;
      return res.status(statusCode).json({ error: result.Message });
    }
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
});

app.get('/api/invoices', async (_, res) => {
  const start = Date.now();
  try {
    const entities: IInvoice[] = await getInvoices();
    const duration = Date.now() - start;
    console.log(`Fetched invoices in ${duration}ms`);
    res.json(entities);
  } catch (error: any) {
    console.error('Error fetching invoices:', error.message);
    res.status(500).json({ error: 'Failed to fetch invoices.' });
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
    return res.status(500).json({ error: 'Failed to fetch payment status.' });
  }
});

app.get('/api/invoice/:invoiceId', async (req, res) => {
  const { invoiceId } = req.params;

  const invoiceDetails = await getInvoiceDetails(invoiceId);

  if (!invoiceDetails) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json(invoiceDetails);
});

app.post('/api/invoice', async (req, res) => {
  // Log incoming request for debugging differences between direct API calls and UI calls.
  try {
    const safeHeaders = { ...req.headers } as any;
    if (safeHeaders.authorization) safeHeaders.authorization = 'REDACTED';
    console.log('/api/invoice request headers:', safeHeaders);
    console.log('/api/invoice request body:', req.body);
  } catch (e) {
    console.error('Failed to log request debug info:', e);
  }

  const { name, amount, notes, contact } = req.body;

  const id = `inv-${Date.now()}`; // Simple unique ID generation

  if (!id || !name || !amount || !contact) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const result = await createInvoice({ id, name, amount, notes, contact, status: IInvoiceStatus.NEW });

    trackEvent('CreateInvoice_API_Success', { invoiceId: result.invoiceId });
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

app.post('api/approveUser', jwtCheck, async (req, res) => {
  try {
    const { email } = req.body;
    // Only allow if the requester is an admin
    const token = req.headers.authorization?.split(' ')[1];

    console.log(token);
    trackEvent('ApproveUser_API_Attempt', { email });
    trackEvent(token || 'no token');

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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

app.post('/api/invoice/create-payment-intent', async (req, res) => {
  const { invoiceId, amount } = req.body;

  if (!invoiceId || !amount) {
    return res.status(400).json({ error: 'Missing invoiceId or amount' });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    metadata: { invoiceId },
    automatic_payment_methods: { enabled: true },
  });

  try {
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe error:', err);
    trackException(err, { invoiceId, amount });
    res.status(500).json({ error: 'Failed to create payment intent' + err.message });
  }
});

app.post('/api/table-warmer', async (req, res) => {
  const tableName = "Warmer";
  const start = Date.now();

  try {
    const entities: IWarmerEntity[] = await queryEntities(tableName, null);

    if (!entities || entities.length === 0) {
      console.warn('Table warmer: no entities found');
      return res.status(404).json({ error: "No warmer entity found." });
    }

    const warmerEntity = entities[0];

    // Optional: update timestamp or ping field to simulate activity
    const updatedEntity: IWarmerEntity = {
      ...warmerEntity
    };

    await updateEntity(tableName, updatedEntity);

    const duration = Date.now() - start;
    console.log(`Table warmer updated in ${duration}ms`);
    trackEvent('TableWarmer_Success', { duration });

    res.json({ message: "Table warmer pinged successfully", duration });
  } catch (error: any) {
    console.error('Table warmer failed:', error.message);
    trackEvent('TableWarmer_Failure', { error: error.message });

    res.status(500).json({ error: "Table warmer failed." });
  }
});

// Export app for testing and start server when run directly
export default app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Rudyard Software Consulting server is live at http://localhost:${PORT}`);
  });
}