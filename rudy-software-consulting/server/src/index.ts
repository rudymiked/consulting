import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sendEmail } from './emailHelper';
import jwksClient from 'jwks-rsa';
import { expressjwt } from 'express-jwt';
import Stripe from 'stripe';
import { getInvoiceDetails, saveInvoice } from './paymentHelper';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
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
app.get('/api', (_, res) => {
  console.log('API is running 🚀');
  res.send('API is running 🚀');
});

// 🚫 Protected route example
app.post('/api/contact', jwtCheck, async (req, res) => {
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
  apiVersion: '2025-03-31.basil',
});

app.post('/api/payInvoice', async (req, res) => {
  const { paymentMethodId, invoiceId, amount } = req.body;

  if (!paymentMethodId || !invoiceId || !amount) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
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
    await saveInvoice({
      id: invoiceId,
      status: 'paid',
      name: invoiceDetails.clientName,
      amount: invoiceDetails.amount,
      notes: invoiceDetails.notes + '/n/nPayment received',
      contact: invoiceDetails.contact,
    }).then(() => {
      console.log('Invoice updated successfully');
      res.status(200).json({ message: 'Invoice updated successfully' });  
    }).catch((error) => {
      console.error('Error saving invoice:', error);
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
  const { name, amount, notes, contact } = req.body;

  const id = `inv-${Date.now()}`; // Simple unique ID generation

  if (!id || !name || !amount || !contact) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const result = await saveInvoice({ id, name, amount, notes, contact, status: 'new' });
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error saving invoice:', error.message);
    res.status(500).json({ error: 'Failed to save invoice.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Rudyard Software Consulting server is live at http://localhost:${PORT}`);
});