import { IInvoiceRequest, IInvoice, IInvoiceStatus, IInvoiceResult } from "./models";
import { trackEvent, trackDependency, trackException, trackTrace } from './telemetry';
import { insertEntity, queryEntities, updateEntity } from './tableClientHelper';
import Stripe from 'stripe';

/*

/api/invoice/pay → creates a PaymentIntent and returns client_secret.

/api/invoice/:id/payment-status → retrieves PaymentIntent from Stripe and returns its status.

Frontend → uses client_secret with PaymentElement to confirm payment, and polls /payment-status to show progress.

*/

export const getInvoices = async (filter?: string | undefined): Promise<IInvoice[]> => {
    const tableName = "invoices";
    trackEvent('GetInvoices_Attempt');

    const entities: IInvoice[] = await queryEntities(tableName, filter);
    const invoices: IInvoice[] = entities.map(entity => ({
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
        dueDate: entity.dueDate ? new Date(entity.dueDate) : undefined,
        timestamp: entity.timestamp
    }));

    trackEvent('GetInvoices_Success', { count: invoices.length });
    return invoices;
}

export const getInvoiceDetails = async (invoiceId: string): Promise<IInvoice> => {
    const tableName = "invoices";

    trackEvent('GetInvoice_Attempt', { invoiceId });
    const filter = `RowKey eq '${invoiceId}'`;
    const entities: IInvoice[] = await queryEntities(tableName, filter);

    if (entities.length > 0) {
        const entity = entities[0];
        const invoice: IInvoice = {
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
            dueDate: entity.dueDate ? new Date(entity.dueDate) : undefined,
            timestamp: entity.timestamp
        };

        trackEvent('GetInvoice_Success', { invoiceId });
        return invoice;
    }

    trackTrace(`Invoice ${invoiceId} not found`, undefined, { invoiceId });
    const err = new Error("Invoice not found");
    trackException(err, { invoiceId });
    throw err;
}

export const createInvoice = async (invoiceData: IInvoiceRequest) => {
    const tableName = "invoices";
    const now = new Date();

    if (!invoiceData.id) {
        invoiceData.id = `inv-${Date.now()}`; // Simple unique ID generation
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
        invoiceData.status = IInvoiceStatus.NEW;
    }

    const invoice: IInvoice = {
        partitionKey: invoiceData.contact,
        rowKey: invoiceData.id,
        id: invoiceData.id,
        name: invoiceData.name,
        amount: invoiceData.amount,
        notes: invoiceData.notes,
        contact: invoiceData.contact,
        paymentIntentId: invoiceData.paymentIntentId,
        status: invoiceData.status,
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : undefined,
        createdDate: now,
        updatedDate: now,
        timestamp: now
    };

    trackEvent('CreateInvoice_Attempt', { invoiceId: invoiceData.id, client: invoiceData.contact });

    try {
        await insertEntity(tableName, invoice);

        const duration = Date.now() - now.getTime();

        trackDependency({
            target: process.env.RUDYARD_STORAGE_ACCOUNT_NAME,
            name: 'Table:createEntity',
            data: `invoices/${invoiceData.id}`,
            durationMs: duration,
            resultCode: '201',
            success: true,
            dependencyTypeName: 'Azure Table'
        });

        trackEvent('CreateInvoice_Success', { invoiceId: invoiceData.id });
        trackTrace(`Invoice ${invoiceData.id} created`, undefined, { amount: invoiceData.amount });

        console.log("Invoice created successfully:", invoice);
        return {
            success: true,
            message: "Invoice created successfully",
            invoiceId: invoiceData.id,
        } as const;
    } catch (error: any) {
        const duration = Date.now() - now.getTime();
        trackDependency({
            target: process.env.RUDYARD_STORAGE_ACCOUNT_NAME,
            name: 'Table:createEntity',
            data: `invoices/${invoiceData.id}`,
            durationMs: duration,
            resultCode: error?.statusCode || '500',
            success: false,
            dependencyTypeName: 'Azure Table',
            properties: { message: error?.message }
        });
        trackException(error, { invoiceId: invoiceData.id });
        console.error("Error creating invoice:", error);
        // Rethrow original error to preserve full SDK/RestError details and stack
        throw error;
    }
}

export const updateInvoice = async (invoiceData: IInvoiceRequest) => {
    const tableName = "invoices";

    const entity = {
        partitionKey: invoiceData.contact || "default",
        rowKey: invoiceData.id,
        ...invoiceData,
    };

    trackEvent('UpdateInvoice_Attempt', { invoiceId: invoiceData.id });
    const start = Date.now();
    try {
        // Update by merging properties; will throw if entity doesn't exist
        await updateEntity(tableName, entity);
        const duration = Date.now() - start;
        trackDependency({
            target: process.env.RUDYARD_STORAGE_ACCOUNT_NAME,
            name: 'Table:updateEntity',
            data: `invoices/${invoiceData.id}`,
            durationMs: duration,
            resultCode: '204',
            success: true,
            dependencyTypeName: 'Azure Table'
        });
        trackEvent('UpdateInvoice_Success', { invoiceId: invoiceData.id });
        console.log("Invoice updated successfully:", entity);
        return {
            success: true,
            message: "Invoice updated successfully",
            invoiceId: invoiceData.id,
        } as const;
    } catch (error: any) {
        const duration = Date.now() - start;
        trackDependency({
            target: process.env.RUDYARD_STORAGE_ACCOUNT_NAME,
            name: 'Table:updateEntity',
            data: `invoices/${invoiceData.id}`,
            durationMs: duration,
            resultCode: error?.statusCode || '500',
            success: false,
            dependencyTypeName: 'Azure Table',
            properties: { message: error?.message }
        });
        trackException(error, { invoiceId: invoiceData.id });
        console.error("Error updating invoice:", error);
        throw error;
    }
}

export const payInvoice = async (
    invoiceId: string,
    amount: number, // amount in cents
    paymentMethodId?: string // optional, since PaymentElement handles method
): Promise<IInvoiceResult & { ClientSecret?: string }> => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: '2025-08-27.basil',
    });

    try {
        trackEvent('PayInvoice_Attempt', { invoiceId });
        const invoiceDetails = await getInvoiceDetails(invoiceId);

        if (!invoiceDetails) {
            const message = `Invoice ${invoiceId} not found for payment`;
            trackTrace(message, undefined, { invoiceId });
            return { Success: false, Message: message, InvoiceId: invoiceId };
        }

        // Ensure invoice is payable
        if (invoiceDetails.status === IInvoiceStatus.CANCELLED) {
            return { Success: false, Message: `Cannot pay a cancelled invoice ${invoiceId}`, InvoiceId: invoiceId };
        }
        if (invoiceDetails.status === IInvoiceStatus.PAID) {
            return { Success: false, Message: `Invoice ${invoiceId} is already paid`, InvoiceId: invoiceId };
        }

        // Validate amount
        const invoiceAmountCents = invoiceDetails.amount; // assume stored in cents
        if (amount <= 0) {
            return { Success: false, Message: `Invalid payment amount for invoice ${invoiceId}.`, InvoiceId: invoiceId };
        }
        if (amount > invoiceAmountCents) {
            return { Success: false, Message: `Payment exceeds invoice amount.`, InvoiceId: invoiceId };
        }

        // Create PaymentIntent (do NOT confirm here)
        const start = Date.now();
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            metadata: {
                invoiceId,
                invoiceNumber: invoiceDetails.id,
                customerName: invoiceDetails.name,
            },
            automatic_payment_methods: { enabled: true }, // works with PaymentElement
        });

        trackDependency({
            target: 'Stripe',
            name: 'PaymentIntent:create',
            data: `invoice/${invoiceId}`,
            durationMs: Date.now() - start,
            resultCode: paymentIntent.status,
            success: true,
            dependencyTypeName: 'Stripe',
        });

        // Return client_secret to frontend
        return {
            Success: true,
            Message: 'PaymentIntent created',
            InvoiceId: invoiceId,
            ClientSecret: paymentIntent.client_secret, // frontend uses this
        };
    } catch (error: any) {
        console.error('Stripe error:', error.message);
        trackException(error, { invoiceId });
        return {
            Success: false,
            Message: 'Stripe error: ' + error.message,
            InvoiceId: invoiceId,
        };
    }
};