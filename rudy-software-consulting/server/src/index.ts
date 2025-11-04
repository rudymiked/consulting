import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as appInsights from 'applicationinsights';
import { EmailOptions, insertIntoContactLogs, sendEmail } from './emailHelper';
import jwksClient from 'jwks-rsa';
import { expressjwt } from 'express-jwt';
import Stripe from 'stripe';
import { createInvoice, getInvoiceDetails, updateInvoice } from './paymentHelper';
import { trackEvent, trackException, trackTrace } from './telemetry';

dotenv.config();

(() => {
  const conn = process.env.APPINSIGHTS_CONNECTION_STRING;

  console.log(conn ? 'Application Insights connection found' : 'No Application Insights connection found');

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
    console.log('App Insights client:', client);

    if (client && client.context && client.context.tags) {
      const roleKey = client.context.keys.cloudRole as string;
      client.context.tags[roleKey] = process.env.APPINSIGHTS_ROLE_NAME || 'rudyard-api';
    }

    console.log('Application Insights configured.');
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
      process.env.FRONTEND_ORIGIN, // optional, set in env for production
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
  console.log(process.env.FRONTEND_ORIGIN);
  console.log('API is running 🚀');
  trackEvent('API_Hit', { origin: process.env.FRONTEND_ORIGIN });
  res.send('API is running 🚀 origin:' + process.env.FRONTEND_ORIGIN);
});

app.post('/api/contact', async (req, res) => {
  const { to, subject, text, html } = req.body;
  const options: EmailOptions = { to, subject, text, html };
  
  await insertIntoContactLogs(options);
  res.status(200).json({ message: 'Contacted successfully' });
  trackEvent('InsertContactLog_API', { to, subject });
});

// 🚫 Protected route example
app.post('/api/sendEmail', jwtCheck, async (req, res) => {
  const { to, subject, text, html } = req.body;

  try {
    await sendEmail({ to, subject, text, html });
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

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
});

app.post('/api/payInvoice', async (req, res) => {
  const { paymentMethodId, invoiceId, amount } = req.body;

  if (!paymentMethodId || !invoiceId || !amount) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    trackEvent('PayInvoice_Attempt', { invoiceId });
    const invoiceDetails = await getInvoiceDetails(invoiceId);
    if (!invoiceDetails) {
      return res.status(404).json({ error: 'Invalid invoice ID.' });
    }

    // Optional: Verify amount matches expected value
    if (invoiceDetails.amount !== amount) {
      return res.status(400).json({ error: 'Amount mismatch.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Use the amount from the request
      currency: 'usd',
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      metadata: {
        paymentId: invoiceId,
        invoiceNumber: invoiceDetails.invoiceId,
        customerName: invoiceDetails.clientName,
      },
    });

    if (paymentIntent.status === 'requires_action') {
      return res.send({
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
      });
    }

      // update invoice in DB
    await updateInvoice({
      id: invoiceId,
      status: 'paid',
      name: invoiceDetails.clientName,
      amount: invoiceDetails.amount,
      notes: invoiceDetails.notes + '/n/nPayment received',
      contact: invoiceDetails.contact,
    }).then(() => {
      console.log('Invoice updated successfully');
      trackEvent('PayInvoice_Success', { invoiceId });
      res.status(200).json({ message: 'Invoice updated successfully' });  
    }).catch((error) => {
      console.error('Error saving invoice:', error);
      trackException(error, { invoiceId });
      res.status(500).json({ error: 'Failed to save invoice.' });
    });

    res.send({ success: true });
  } catch (error: any) {
    console.error('Stripe error:', error.message);
    res.status(400).send({ error: error.message });
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
    const result = await createInvoice({ id, name, amount, notes, contact, status: 'new' });

    trackEvent('CreateInvoice_API_Success', { invoiceId: result.invoiceId });
    console.log(result);

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error saving invoice:', error.message);
    trackException(error, { name, contact });
    res.status(500).json({ error: 'Failed to save invoice.' + error.message });
  }
});

// Export app for testing and start server when run directly
export default app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Rudyard Software Consulting server is live at http://localhost:${PORT}`);
  });
}