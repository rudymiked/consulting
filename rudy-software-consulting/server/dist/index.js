"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appInsightsClient = void 0;
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const applicationinsights_1 = __importDefault(require("applicationinsights"));
const emailHelper_1 = require("./emailHelper");
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const express_jwt_1 = require("express-jwt");
const invoiceHelper_1 = require("./invoiceHelper");
const telemetry_1 = require("./telemetry");
const authHelper_1 = require("./authHelper");
const models_1 = require("./models");
const stripe_1 = __importDefault(require("stripe"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const tableClientHelper_1 = require("./tableClientHelper");
const clientHelper_1 = require("./clientHelper");
dotenv_1.default.config();
const conn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || "";
if (!conn) {
    console.log("Application Insights not configured (no connection string).");
}
else {
    try {
        applicationinsights_1.default?.setup(conn)
            .setAutoCollectRequests(true)
            .setAutoCollectDependencies(true)
            .setAutoCollectConsole(true, true)
            .setAutoCollectExceptions(true)
            .setAutoDependencyCorrelation(true)
            .start();
        if (applicationinsights_1.default?.defaultClient?.context?.tags) {
            const roleKey = applicationinsights_1.default.defaultClient.context.keys.cloudRole;
            applicationinsights_1.default.defaultClient.context.tags[roleKey] =
                process.env.APPINSIGHTS_ROLE_NAME || "rudyard-api";
        }
        console.log("Application Insights initialized");
    }
    catch (err) {
        console.error("Failed to initialize Application Insights:", err?.message || err);
    }
}
exports.appInsightsClient = applicationinsights_1.default?.defaultClient;
const app = (0, express_1.default)();
app.set('trust proxy', 1); // or true
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    keyGenerator: (req) => {
        // Prefer X-Forwarded-For if present
        const forwarded = req.headers["x-forwarded-for"];
        let ip;
        if (typeof forwarded === "string") {
            ip = forwarded.split(",")[0].trim();
        }
        else if (Array.isArray(forwarded)) {
            ip = forwarded[0];
        }
        else {
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
// Middleware
// Allow CORS only from known origins.
const frontendOrigin = (process.env.FRONTEND_ORIGIN || '').trim();
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
];
if (frontendOrigin) {
    if (frontendOrigin.startsWith('http://') || frontendOrigin.startsWith('https://')) {
        allowedOrigins.push(frontendOrigin);
    }
    else {
        allowedOrigins.push(`https://${frontendOrigin}`);
        allowedOrigins.push(`https://www.${frontendOrigin}`);
    }
}
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false,
    optionsSuccessStatus: 204,
};
app.use((0, cors_1.default)(corsOptions));
// Handle preflight requests centrally without using a path pattern that breaks path-to-regexp.
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        // run the CORS middleware for this request then end with 204
        return (0, cors_1.default)(corsOptions)(req, res, () => res.sendStatus(204));
    }
    next();
});
app.use(express_1.default.json());
// 🔑 JWT Validation Setup
const client = (0, jwks_rsa_1.default)({
    jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`
});
async function getSigningKey(header) {
    return new Promise((resolve, reject) => {
        client.getSigningKey(header.kid, (err, key) => {
            if (err) {
                reject(err);
            }
            else {
                const signingKey = key?.getPublicKey();
                if (typeof signingKey === 'string') {
                    resolve(signingKey);
                }
                else {
                    reject(new Error('Signing key is undefined'));
                }
            }
        });
    });
}
const jwtCheck = (0, express_jwt_1.expressjwt)({
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
    //console.log('API is running 🚀');
    res.send('API is running 🚀');
});
app.post('/api/contact', async (req, res) => {
    const { to, subject, text, html } = req.body;
    const options = { to, subject, text, html, sent: false };
    try {
        await (0, emailHelper_1.insertIntoContactLogs)(options);
        (0, telemetry_1.trackEvent)('InsertContactLog_API', { to, subject });
        res.status(200).json({ message: 'Contacted successfully' });
    }
    catch (error) {
        console.error('Error inserting contact log:', error);
        res.status(500).json({ error: 'Failed to process contact request' });
    }
});
// Protected route example
app.post('/api/sendEmail', jwtCheck, async (req, res) => {
    const { to, subject, text, html } = req.body;
    try {
        await (0, emailHelper_1.sendEmail)({ to, subject, text, html, sent: true });
        res.status(200).json({ message: 'Email sent successfully' });
    }
    catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'Failed to send email: ' + error.message });
    }
});
app.get('/api/ping', (_, res) => {
    res.json({ message: 'pong' });
});
app.get('/api/email', jwtCheck, (_, res) => {
    res.json({ message: 'ok' });
});
// routes/invoice.ts
app.post('/api/invoice/finalize-payment', async (req, res) => {
    const { invoiceId, paymentIntentId } = req.body;
    if (!invoiceId || !paymentIntentId) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    try {
        const result = await (0, invoiceHelper_1.finalizePayment)(invoiceId, paymentIntentId);
        if (!result.success) {
            return res.status(400).json(result);
        }
        return res.status(200).json(result);
    }
    catch (err) {
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
        const result = await (0, invoiceHelper_1.payInvoice)(invoiceId, amount, paymentMethodId);
        if (!result.Success) {
            const statusCode = result.Message.includes('Invalid') ? 400 : 500;
            return res.status(statusCode).json({ error: result.Message });
        }
        // Try to send confirmation email
        try {
            const invoice = await (0, invoiceHelper_1.getInvoiceDetails)(invoiceId);
            if (!invoice)
                throw new Error(`Invoice ${invoiceId} not found for email notification`);
            if (!invoice.contact)
                throw new Error(`Invoice ${invoiceId} has no contact email`);
            const to = invoice.contact;
            const subject = `Payment Received for Invoice ${invoiceId}`;
            const paidDollars = amount / 100;
            const isPartial = invoice.amount > amount;
            const isOverPaid = invoice.amount < amount;
            let text;
            let html;
            const invoiceLink = `https://rudyardtechnologies.com/invoice/${invoiceId}`;
            const invoiceLinkHTML = `<a href='${invoiceLink}'>${invoiceId}</a>`;
            if (isPartial) {
                text = `${invoice.name},\n\nWe have received your partial payment of $${paidDollars} for Invoice ${invoiceId} (Total Amount: $${invoice.amount}).\n\nThank you for your business!\n\nBest regards,\nRudyard Software Consulting`;
                html = `<p>${invoice.name},</p><p>We have received your partial payment of <strong>$${paidDollars}</strong> for Invoice <strong>${invoiceLinkHTML}</strong> (Total Amount: <strong>$${invoice.amount}</strong>).</p><p>Thank you for your business!</p><p>Best regards,<br/>Rudyard Software Consulting</p>`;
            }
            else if (isOverPaid) {
                text = `${invoice.name},\n\nWe have received your payment of $${paidDollars} for Invoice ${invoiceId}, which exceeds the total amount due ($${invoice.amount}).\n\nWe will contact you regarding the overpayment.\n\nThank you for your business!\n\nBest regards,\nRudyard Software Consulting`;
                html = `<p>${invoice.name},</p><p>We have received your payment of <strong>$${paidDollars}</strong> for Invoice <strong>${invoiceLinkHTML}</strong>, which exceeds the total amount due (<strong>$${invoice.amount}</strong>).</p><p>We will contact you regarding the overpayment.</p><p>Thank you for your business!</p><p>Best regards,<br/>Rudyard Software Consulting</p>`;
            }
            else {
                text = `${invoice.name},\n\nWe have received your payment for Invoice ${invoiceId} amounting to $${paidDollars}.\n\nThank you for your business!\n\nBest regards,\nRudyard Software Consulting`;
                html = `<p>${invoice.name},</p><p>We have received your payment for Invoice <strong>${invoiceLinkHTML}</strong> amounting to <strong>$${paidDollars}</strong>.</p><p>Thank you for your business!</p><p>Best regards,<br/>Rudyard Software Consulting</p>`;
            }
            if (isPartial) {
                (0, telemetry_1.trackEvent)('PartialPayment_Received', {
                    invoiceId,
                    paidAmount: amount,
                    totalAmount: invoice.amount,
                });
            }
            if (isOverPaid) {
                (0, telemetry_1.trackEvent)('OverPayment_Received', {
                    invoiceId,
                    paidAmount: amount,
                    totalAmount: invoice.amount,
                });
            }
            await (0, emailHelper_1.sendEmail)({ to, subject, text, html, sent: true });
            (0, telemetry_1.trackEvent)('EmailSent', { invoiceId, to });
            return res.status(200).json({
                success: true,
                message: result.Message,
                email: 'sent',
                clientSecret: result.ClientSecret, // for frontend PaymentElement
                paymentIntentId: invoice?.paymentIntentId, // for admin/debugging
            });
        }
        catch (emailError) {
            console.error('Email error:', emailError);
            (0, telemetry_1.trackEvent)('EmailFailed', { invoiceId, error: emailError.message });
            return res.status(200).json({
                success: true,
                message: result.Message,
                email: 'failed',
                emailError: emailError.message,
            });
        }
    }
    catch (err) {
        console.error('Unexpected error:', err);
        return res.status(500).json({ error: 'Unexpected server error.' });
    }
});
app.get('/api/invoices', jwtCheck, async (req, res) => {
    const start = Date.now();
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const user = (0, authHelper_1.verifyToken)(token || '');
        if (!user) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        let entities;
        // Site admins can see all invoices
        if (user.siteAdmin) {
            entities = await (0, invoiceHelper_1.getInvoices)();
        }
        else {
            // Regular users only see their client's invoices
            entities = await (0, clientHelper_1.getInvoicesByClientId)(user.clientId);
        }
        const duration = Date.now() - start;
        console.log(`Fetched invoices in ${duration}ms`);
        res.json(entities);
    }
    catch (error) {
        console.error('Error fetching invoices:', error.message);
        res.status(500).json({ error: 'Failed to fetch invoices.' });
    }
});
app.get('/api/invoice/:id/payment-status', async (req, res) => {
    const invoiceId = req.params.id;
    try {
        const invoice = await (0, invoiceHelper_1.getInvoiceDetails)(invoiceId);
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
    }
    catch (err) {
        console.error('Error fetching payment status:', err.message);
        return res.status(500).json({ error: 'Failed to fetch payment status.' });
    }
});
app.get('/api/invoice/:invoiceId', async (req, res) => {
    const { invoiceId } = req.params;
    const invoiceDetails = await (0, invoiceHelper_1.getInvoiceDetails)(invoiceId);
    if (!invoiceDetails) {
        return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoiceDetails);
});
app.post('/api/invoice', jwtCheck, async (req, res) => {
    const { name, amount, notes, contact, clientId } = req.body;
    if (!name || !amount || !contact) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    try {
        // Use clientId from request, or default to contact for backwards compatibility
        const partitionKey = clientId || contact;
        const result = await (0, invoiceHelper_1.createInvoice)({
            id: `inv-${crypto_1.default.randomUUID()}`,
            name,
            amount,
            notes,
            contact,
            clientId: partitionKey,
            status: models_1.IInvoiceStatus.NEW
        });
        (0, telemetry_1.trackEvent)('CreateInvoice_API_Success', { invoiceId: result.invoiceId, clientId: partitionKey });
        console.log(result);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error saving invoice:', error.message);
        (0, telemetry_1.trackException)(error, { name, contact });
        res.status(500).json({ error: 'Failed to save invoice.' + error.message });
    }
});
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await (0, authHelper_1.registerUser)(email, password);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.post('/api/approveUser', async (req, res) => {
    try {
        const { email } = req.body;
        // Only allow if the requester is an admin
        const token = req.headers.authorization?.split(' ')[1];
        (0, telemetry_1.trackEvent)('ApproveUser_API_Attempt', { email });
        const result = await (0, authHelper_1.approveUser)(email, token);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { token } = await (0, authHelper_1.loginUser)(email, password);
        res.json({ token });
    }
    catch (err) {
        (0, telemetry_1.trackException)(err, { email: req.body.email });
        console.log(err);
        res.status(401).json({ error: err.message });
    }
});
app.get('/api/protected', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const user = (0, authHelper_1.verifyToken)(token || '');
    if (!user)
        return res.status(403).json({ error: 'Unauthorized' });
    res.json({ message: `Welcome ${user.email}` });
});
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
});
app.post('/api/invoice/create-payment-intent', async (req, res) => {
    const { invoiceId, amount } = req.body;
    if (!invoiceId || !amount) {
        return res.status(400).json({ error: 'Missing invoiceId or amount' });
    }
    try {
        const invoice = await (0, invoiceHelper_1.getInvoiceDetails)(invoiceId);
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        if (invoice.status.toUpperCase() === models_1.IInvoiceStatus.CANCELLED.toUpperCase()) {
            return res.status(400).json({ error: 'Invoice is cancelled' });
        }
        if (invoice.status.toUpperCase() === models_1.IInvoiceStatus.PAID.toUpperCase()) {
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
    }
    catch (err) {
        console.error('Stripe error:', err);
        (0, telemetry_1.trackException)(err, { invoiceId, amount });
        res.status(500).json({ error: 'Failed to create payment intent' + err.message });
    }
});
app.post('/api/table-warmer', async (req, res) => {
    const start = Date.now();
    try {
        const entities = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.Warmer, null);
        if (!entities || entities.length === 0) {
            console.warn('Table warmer: no entities found');
            return res.status(404).json({ error: "No warmer entity found." });
        }
        const warmerEntity = entities[0];
        if (!warmerEntity.partitionKey || !warmerEntity.rowKey) {
            throw new Error(`Invalid warmer entity: missing PartitionKey/RowKey`);
        }
        const updatedEntity = {
            ...warmerEntity,
            lastPing: new Date(), // add a field to simulate activity
        };
        await (0, tableClientHelper_1.updateEntity)(models_1.TableNames.Warmer, updatedEntity);
        const duration = Date.now() - start;
        console.log(`Table warmer updated in ${duration}ms`);
        (0, telemetry_1.trackEvent)('TableWarmer_Success', { duration });
        return res.json({ message: "Table warmer pinged successfully", duration });
    }
    catch (error) {
        console.error('Table warmer failed:', error);
        (0, telemetry_1.trackEvent)('TableWarmer_Failure', { error: error.message });
        return res.status(500).json({ error: "Table warmer failed.", details: error.message });
    }
});
// Client Management Routes
app.post('/api/client', jwtCheck, async (req, res) => {
    try {
        const { clientId, clientName, contactEmail, address, phone } = req.body;
        if (!clientId || !clientName || !contactEmail) {
            return res.status(400).json({ error: 'Missing required fields: clientId, clientName, contactEmail' });
        }
        const client = await (0, clientHelper_1.addClient)(clientId, clientName, contactEmail, address || '', phone || '');
        (0, telemetry_1.trackEvent)('CreateClient_Success', { clientId });
        res.status(201).json(client);
    }
    catch (err) {
        console.error('Error creating client:', err);
        (0, telemetry_1.trackException)(err, { clientId: req.body.clientId });
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/clients', jwtCheck, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const user = (0, authHelper_1.verifyToken)(token || '');
        if (!user) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        // Site admins can see all clients
        if (user.siteAdmin) {
            const clients = await (0, clientHelper_1.getAllClients)();
            res.json(clients);
        }
        else {
            // Regular users only see their own client
            const client = await (0, clientHelper_1.getClientById)(user.clientId);
            res.json(client ? [client] : []);
        }
    }
    catch (err) {
        console.error('Error fetching clients:', err);
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/client/:clientId', jwtCheck, async (req, res) => {
    try {
        const { clientId } = req.params;
        const token = req.headers.authorization?.split(' ')[1];
        const user = (0, authHelper_1.verifyToken)(token || '');
        if (!user) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        // Users can only access their own client unless they're admin
        if (!user.siteAdmin && user.clientId !== clientId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const client = await (0, clientHelper_1.getClientById)(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(client);
    }
    catch (err) {
        console.error('Error fetching client:', err);
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/client/:clientId/invoices', jwtCheck, async (req, res) => {
    try {
        const { clientId } = req.params;
        const token = req.headers.authorization?.split(' ')[1];
        const user = (0, authHelper_1.verifyToken)(token || '');
        if (!user) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        // Users can only access their own client's invoices unless they're admin
        if (!user.siteAdmin && user.clientId !== clientId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const invoices = await (0, clientHelper_1.getInvoicesByClientId)(clientId);
        res.json(invoices);
    }
    catch (err) {
        console.error('Error fetching client invoices:', err);
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/client/:clientId/:contactEmail', jwtCheck, async (req, res) => {
    try {
        const { clientId, contactEmail } = req.params;
        const token = req.headers.authorization?.split(' ')[1];
        const user = (0, authHelper_1.verifyToken)(token || '');
        if (!user) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        // Only site admins can delete clients
        if (!user.siteAdmin) {
            return res.status(403).json({ error: 'Access denied: Admin only' });
        }
        await (0, clientHelper_1.deleteClient)(clientId, contactEmail);
        (0, telemetry_1.trackEvent)('DeleteClient_Success', { clientId });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error deleting client:', err);
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/users', jwtCheck, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const user = (0, authHelper_1.verifyToken)(token || '');
        if (!user) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        // Only site admins can view all users
        if (!user.siteAdmin) {
            return res.status(403).json({ error: 'Access denied: Admin only' });
        }
        const users = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.Users, null);
        const safeUsers = users.map((u) => {
            const { hash, salt, ...rest } = u || {};
            return rest;
        });
        res.json(safeUsers);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Export app for testing and start server when run directly
exports.default = app;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Rudyard Software Consulting server is live at http://localhost:${PORT}`);
    });
}
