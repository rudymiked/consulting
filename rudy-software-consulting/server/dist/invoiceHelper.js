"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizePayment = exports.payInvoice = exports.updateInvoice = exports.createInvoice = exports.getInvoiceDetails = exports.getInvoices = void 0;
const models_1 = require("./models");
const crypto_1 = __importDefault(require("crypto"));
const telemetry_1 = require("./telemetry");
const tableClientHelper_1 = require("./tableClientHelper");
const stripe_1 = __importDefault(require("stripe"));
const emailHelper_1 = require("./emailHelper");
/*

/api/invoice/pay → creates a PaymentIntent and returns client_secret.

/api/invoice/:id/payment-status → retrieves PaymentIntent from Stripe and returns its status.

Frontend → uses client_secret with PaymentElement to confirm payment, and polls /payment-status to show progress.

*/
const getInvoices = async (filter) => {
    (0, telemetry_1.trackEvent)('GetInvoices_Attempt');
    const entities = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.Invoices, filter);
    const invoices = entities.map(entity => ({
        partitionKey: entity.partitionKey,
        rowKey: entity.rowKey,
        id: entity.id,
        name: entity.name,
        amount: entity.amount,
        notes: entity.notes,
        contact: entity.contact,
        paymentIntentId: entity.paymentIntentId,
        createdDate: new Date(entity.createdDate),
        updatedDate: new Date(entity.updatedDate),
        status: entity.status,
        dueDate: entity.dueDate ? new Date(entity.dueDate) : undefined
    }));
    (0, telemetry_1.trackEvent)('GetInvoices_Success', { count: invoices.length });
    return invoices;
};
exports.getInvoices = getInvoices;
const getInvoiceDetails = async (invoiceId) => {
    (0, telemetry_1.trackEvent)('GetInvoice_Attempt', { invoiceId });
    const filter = `RowKey eq '${invoiceId}'`;
    const entities = await (0, tableClientHelper_1.queryEntities)(models_1.TableNames.Invoices, filter);
    if (entities.length > 0) {
        const entity = entities[0];
        const invoice = {
            partitionKey: entity.partitionKey,
            rowKey: entity.rowKey,
            id: entity.id,
            name: entity.name,
            amount: entity.amount,
            notes: entity.notes,
            contact: entity.contact,
            paymentIntentId: entity.paymentIntentId,
            createdDate: new Date(entity.createdDate),
            updatedDate: new Date(entity.updatedDate),
            status: entity.status,
            dueDate: entity.dueDate ? new Date(entity.dueDate) : undefined
        };
        (0, telemetry_1.trackEvent)('GetInvoice_Success', { invoiceId });
        return invoice;
    }
    (0, telemetry_1.trackTrace)(`Invoice ${invoiceId} not found`, undefined, { invoiceId });
    const err = new Error("Invoice not found");
    (0, telemetry_1.trackException)(err, { invoiceId });
    throw err;
};
exports.getInvoiceDetails = getInvoiceDetails;
const createInvoice = async (invoiceData) => {
    const now = new Date();
    if (!invoiceData.id) {
        invoiceData.id = `inv-${crypto_1.default.randomUUID()}`; // Unpredictable unique ID
    }
    if (!invoiceData.name) {
        invoiceData.name = "<Unnamed>";
    }
    if (!invoiceData.contact) {
        invoiceData.contact = "default";
    }
    if (!invoiceData.paymentIntentId) {
        invoiceData.paymentIntentId = "";
    }
    if (!invoiceData.status) {
        invoiceData.status = models_1.IInvoiceStatus.NEW;
    }
    // Use clientId for partitioning if provided, otherwise fall back to contact
    const partitionKey = invoiceData.clientId || invoiceData.contact;
    const invoice = {
        partitionKey: partitionKey,
        rowKey: invoiceData.id,
        id: invoiceData.id,
        name: invoiceData.name,
        amount: invoiceData.amount,
        notes: invoiceData.notes,
        contact: invoiceData.contact,
        clientId: invoiceData.clientId,
        paymentIntentId: invoiceData.paymentIntentId,
        status: invoiceData.status,
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : undefined,
        createdDate: now,
        updatedDate: now
    };
    (0, telemetry_1.trackEvent)('CreateInvoice_Attempt', { invoiceId: invoiceData.id, clientId: partitionKey });
    try {
        await (0, tableClientHelper_1.insertEntity)(models_1.TableNames.Invoices, invoice);
        const duration = Date.now() - now.getTime();
        (0, telemetry_1.trackDependency)({
            target: process.env.RUDYARD_STORAGE_ACCOUNT_NAME,
            name: 'Table:createEntity',
            data: `invoices/${invoiceData.id}`,
            durationMs: duration,
            resultCode: '201',
            success: true,
            dependencyTypeName: 'Azure Table'
        });
        (0, telemetry_1.trackEvent)('CreateInvoice_Success', { invoiceId: invoiceData.id });
        (0, telemetry_1.trackTrace)(`Invoice ${invoiceData.id} created`, undefined, { amount: invoiceData.amount });
        console.log("Invoice created successfully:", invoice);
        return {
            success: true,
            message: "Invoice created successfully",
            invoiceId: invoiceData.id,
        };
    }
    catch (error) {
        const duration = Date.now() - now.getTime();
        (0, telemetry_1.trackDependency)({
            target: process.env.RUDYARD_STORAGE_ACCOUNT_NAME,
            name: 'Table:createEntity',
            data: `invoices/${invoiceData.id}`,
            durationMs: duration,
            resultCode: error?.statusCode || '500',
            success: false,
            dependencyTypeName: 'Azure Table',
            properties: { message: error?.message }
        });
        (0, telemetry_1.trackException)(error, { invoiceId: invoiceData.id });
        console.error("Error creating invoice:", error);
        // Rethrow original error to preserve full SDK/RestError details and stack
        throw error;
    }
};
exports.createInvoice = createInvoice;
const updateInvoice = async (invoiceData) => {
    const entity = {
        partitionKey: invoiceData.contact || "default",
        rowKey: invoiceData.id,
        ...invoiceData,
    };
    (0, telemetry_1.trackEvent)('UpdateInvoice_Attempt', { invoiceId: invoiceData.id });
    const start = Date.now();
    try {
        // Update by merging properties; will throw if entity doesn't exist
        await (0, tableClientHelper_1.updateEntity)(models_1.TableNames.Invoices, entity);
        const duration = Date.now() - start;
        (0, telemetry_1.trackDependency)({
            target: process.env.RUDYARD_STORAGE_ACCOUNT_NAME,
            name: 'Table:updateEntity',
            data: `invoices/${invoiceData.id}`,
            durationMs: duration,
            resultCode: '204',
            success: true,
            dependencyTypeName: 'Azure Table'
        });
        (0, telemetry_1.trackEvent)('UpdateInvoice_Success', { invoiceId: invoiceData.id });
        console.log("Invoice updated successfully:", entity);
        return {
            success: true,
            message: "Invoice updated successfully",
            invoiceId: invoiceData.id,
        };
    }
    catch (error) {
        const duration = Date.now() - start;
        (0, telemetry_1.trackDependency)({
            target: process.env.RUDYARD_STORAGE_ACCOUNT_NAME,
            name: 'Table:updateEntity',
            data: `invoices/${invoiceData.id}`,
            durationMs: duration,
            resultCode: error?.statusCode || '500',
            success: false,
            dependencyTypeName: 'Azure Table',
            properties: { message: error?.message }
        });
        (0, telemetry_1.trackException)(error, { invoiceId: invoiceData.id });
        console.error("Error updating invoice:", error);
        throw error;
    }
};
exports.updateInvoice = updateInvoice;
const payInvoice = async (invoiceId, amount, // expected in cents
paymentMethodId) => {
    const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-08-27.basil',
    });
    try {
        (0, telemetry_1.trackEvent)('PayInvoice_Attempt', { invoiceId });
        const invoiceDetails = await (0, exports.getInvoiceDetails)(invoiceId);
        if (!invoiceDetails) {
            const message = `Invoice ${invoiceId} not found for payment`;
            (0, telemetry_1.trackTrace)(message, undefined, { invoiceId });
            return { Success: false, Message: message, InvoiceId: invoiceId };
        }
        if (invoiceDetails.status.toUpperCase() === models_1.IInvoiceStatus.CANCELLED.toUpperCase()) {
            return { Success: false, Message: `Cannot pay a cancelled invoice ${invoiceId}`, InvoiceId: invoiceId };
        }
        if (invoiceDetails.status.toUpperCase() === models_1.IInvoiceStatus.PAID.toUpperCase()) {
            return { Success: false, Message: `Invoice ${invoiceId} is already paid`, InvoiceId: invoiceId };
        }
        const invoiceAmountCents = invoiceDetails.amount;
        console.log(`Invoice ${invoiceId}: stored=${invoiceAmountCents} cents, requested=${amount} cents`);
        (0, telemetry_1.trackEvent)("InvoiceDetails", { invoiceDetails });
        if (amount <= 0) {
            return { Success: false, Message: `Invalid payment amount for invoice ${invoiceId}.`, InvoiceId: invoiceId };
        }
        if (amount > invoiceAmountCents) {
            return { Success: false, Message: `Payment exceeds invoice amount.`, InvoiceId: invoiceId };
        }
        if (amount < invoiceAmountCents / 100) {
            return { Success: false, Message: `Payment amount appears to be in dollars instead of cents.`, InvoiceId: invoiceId };
        }
        let paymentIntent;
        if (invoiceDetails.paymentIntentId) {
            try {
                const existing = await stripe.paymentIntents.retrieve(invoiceDetails.paymentIntentId);
                if (existing.status === 'requires_payment_method' ||
                    existing.status === 'requires_confirmation') {
                    if (!existing.metadata?.invoiceId || existing.metadata.invoiceId !== invoiceId) {
                        throw new Error('Existing PaymentIntent does not match invoice.');
                    }
                    paymentIntent = existing;
                }
                else {
                    // Existing intent is not reusable — create a new one
                    paymentIntent = await stripe.paymentIntents.create({
                        amount,
                        currency: 'usd',
                        metadata: {
                            invoiceId,
                            invoiceNumber: invoiceDetails.id,
                            customerName: invoiceDetails.name,
                        },
                        automatic_payment_methods: { enabled: true },
                    });
                    invoiceDetails.paymentIntentId = paymentIntent.id;
                }
            }
            catch (err) {
                // If retrieval fails, create a new one
                paymentIntent = await stripe.paymentIntents.create({
                    amount,
                    currency: 'usd',
                    metadata: {
                        invoiceId,
                        invoiceNumber: invoiceDetails.id,
                        customerName: invoiceDetails.name,
                    },
                    automatic_payment_methods: { enabled: true },
                });
                invoiceDetails.paymentIntentId = paymentIntent.id;
            }
        }
        else {
            // No existing intent — create one
            paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency: 'usd',
                metadata: {
                    invoiceId,
                    invoiceNumber: invoiceDetails.id,
                    customerName: invoiceDetails.name,
                },
                automatic_payment_methods: { enabled: true },
            });
            invoiceDetails.paymentIntentId = paymentIntent.id;
        }
        (0, telemetry_1.trackDependency)({
            target: 'Stripe',
            name: 'PaymentIntent:createOrReuse',
            data: `invoice/${invoiceId}`,
            durationMs: 0, // optional: measure duration if needed
            resultCode: paymentIntent.status,
            success: true,
            dependencyTypeName: 'Stripe',
        });
        invoiceDetails.status =
            amount === invoiceAmountCents ? models_1.IInvoiceStatus.PAID : models_1.IInvoiceStatus.PARTIALLY_PAID;
        await (0, exports.updateInvoice)(invoiceDetails);
        return {
            Success: true,
            Message: 'PaymentIntent ready',
            InvoiceId: invoiceId,
            ClientSecret: paymentIntent.client_secret,
        };
    }
    catch (error) {
        console.error('Stripe error:', error.message);
        (0, telemetry_1.trackException)(error, { invoiceId });
        return {
            Success: false,
            Message: 'Stripe error: ' + error.message,
            InvoiceId: invoiceId,
        };
    }
};
exports.payInvoice = payInvoice;
// services/InvoiceService.ts
const finalizePayment = async (invoiceId, paymentIntentId) => {
    const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-08-27.basil',
    });
    // Retrieve PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
        return { success: false, message: `PaymentIntent not succeeded (status: ${paymentIntent.status})` };
    }
    if (!paymentIntent.metadata?.invoiceId || paymentIntent.metadata.invoiceId !== invoiceId) {
        return { success: false, message: 'PaymentIntent does not match invoice' };
    }
    // Get invoice details
    const invoice = await (0, exports.getInvoiceDetails)(invoiceId);
    if (!invoice) {
        return { success: false, message: `Invoice ${invoiceId} not found` };
    }
    if (paymentIntent.currency !== 'usd') {
        return { success: false, message: 'Unsupported currency' };
    }
    if (paymentIntent.amount <= 0 || paymentIntent.amount > invoice.amount) {
        return { success: false, message: 'Invalid payment amount' };
    }
    // Update invoice status
    invoice.status =
        paymentIntent.amount === invoice.amount
            ? models_1.IInvoiceStatus.PAID
            : models_1.IInvoiceStatus.PARTIALLY_PAID;
    invoice.paymentIntentId = paymentIntent.id;
    invoice.updatedDate = new Date();
    await (0, exports.updateInvoice)(invoice);
    // Send confirmation email to client
    const paidDollars = paymentIntent.amount / 100;
    const subject = `Payment Received for Invoice ${invoiceId}`;
    const invoiceLink = `https://rudyardtechnologies.com/invoice/${invoiceId}`;
    const text = `${invoice.name},\n\nWe have received your payment of $${paidDollars} for Invoice ${invoiceId}.\n\nThank you for your business!\n\nBest regards,\nRudyard Software Consulting`;
    const html = `<p>${invoice.name},</p><p>We have received your payment for Invoice <a href='${invoiceLink}'>${invoiceId}</a> amounting to <strong>$${paidDollars}</strong>.</p><p>Thank you for your business!</p><p>Best regards,<br/>Rudyard Software Consulting</p>`;
    await (0, emailHelper_1.sendEmail)({ to: invoice.contact, subject, text, html, sent: true });
    // Send confirmation email to Rudyard
    const rudyardEmail = process.env.EMAIL_USERNAME || 'info@rudyardtechonologies.com';
    const rudyardSubject = `Invoice ${invoiceId} Paid`;
    const rudyardText = `Invoice ${invoiceId} has been paid by ${invoice.name}.\n\nAmount: $${paidDollars}\nPaymentIntent ID: ${paymentIntent.id}`;
    const rudyardHtml = `<p>Invoice <strong>${invoiceId}</strong> has been paid by ${invoice.name}.</p><p>Amount: <strong>$${paidDollars}</strong><br/>PaymentIntent ID: <strong>${paymentIntent.id}</strong></p>`;
    await (0, emailHelper_1.sendEmail)({ to: rudyardEmail, subject: rudyardSubject, text: rudyardText, html: rudyardHtml, sent: true });
    return { success: true, message: 'Invoice finalized and email sent' };
};
exports.finalizePayment = finalizePayment;
