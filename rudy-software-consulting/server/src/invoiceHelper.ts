import { InvoiceRequest, Invoice, InvoiceStatus, InvoiceResult } from "./models";
import { trackEvent, trackDependency, trackException, trackTrace } from './telemetry';
import { insertEntity, queryEntities, updateEntity } from './tableClientHelper';
import Stripe from 'stripe';

export const getInvoices = async (filter?: string | undefined): Promise<Invoice[]> => {
    const tableName = "invoices";
    trackEvent('GetInvoices_Attempt');

    const entities = await queryEntities(tableName, filter);
    const invoices: Invoice[] = entities.map(entity => ({
        id: entity.rowKey,
        name: entity.name,
        amount: entity.amount,
        notes: entity.notes,
        contact: entity.contact,
        createdDate: new Date(entity.createdDate),
        updatedDate: new Date(entity.updatedDate),
        status: entity.status,
        dueDate: entity.dueDate ? new Date(entity.dueDate) : undefined,
    }));

    trackEvent('GetInvoices_Success', { count: invoices.length });
    return invoices;
}

export const getInvoiceDetails = async (invoiceId: string): Promise<Invoice> => {
    const tableName = "invoices";

    trackEvent('GetInvoice_Attempt', { invoiceId });
    const filter = `RowKey eq '${invoiceId}'`;
    const entities = await queryEntities(tableName, filter);

    if (entities.length > 0) {
        const entity = entities[0];
        const invoice: Invoice = {
            id: entity.rowKey,
            name: entity.name,
            amount: entity.amount,
            notes: entity.notes,
            contact: entity.contact,
            createdDate: new Date(entity.createdDate),
            updatedDate: new Date(entity.updatedDate),
            status: entity.status,
            dueDate: entity.dueDate ? new Date(entity.dueDate) : undefined,
        };

        trackEvent('GetInvoice_Success', { invoiceId });
        return invoice;
    }

    trackTrace(`Invoice ${invoiceId} not found`, undefined, { invoiceId });
    const err = new Error("Invoice not found");
    trackException(err, { invoiceId });
    throw err;
}

export const createInvoice = async (invoiceData: InvoiceRequest) => {
    const tableName = "invoices";

    const entity = {
        partitionKey: invoiceData.contact || "default",
        rowKey: invoiceData.id,
        ...invoiceData,
    };

    trackEvent('CreateInvoice_Attempt', { invoiceId: invoiceData.id, client: invoiceData.contact });
    const start = Date.now();
    try {
        await insertEntity(tableName, entity);

        const duration = Date.now() - start;

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

        console.log("Invoice created successfully:", entity);
        return {
            success: true,
            message: "Invoice created successfully",
            invoiceId: invoiceData.id,
        } as const;
    } catch (error: any) {
        const duration = Date.now() - start;
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

export const updateInvoice = async (invoiceData: InvoiceRequest) => {
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

export const payInvoice = async (invoiceId: string, amount: number, paymentMethodId: string): Promise<InvoiceResult> => {
    // Initialize Stripe
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

        let invoiceStatus: InvoiceStatus = invoiceDetails.status;
        let paymentNode: string;

        switch (invoiceDetails.status) {
            case InvoiceStatus.CANCELLED: {
                const message = `Cannot pay a cancelled invoice ${invoiceId}`;
                trackTrace(message, undefined, { invoiceId });
                return { Success: false, Message: message, InvoiceId: invoiceId };
            }
            case InvoiceStatus.PAID: {
                const message = `Invoice ${invoiceId} is already paid`;
                trackTrace(message, undefined, { invoiceId });
                return { Success: false, Message: message, InvoiceId: invoiceId };
            }
        }

        // Normalize invoice amount to cents for comparison
        const invoiceAmountCents = invoiceDetails.amount * 100;

        switch (true) {
            case amount === invoiceAmountCents: {
                invoiceStatus = InvoiceStatus.PAID;
                paymentNode = '\n\nPayment received in full';
                break;
            }
            case amount > 0 && amount < invoiceAmountCents: {
                invoiceStatus = InvoiceStatus.PARTIAL_PAYMENT;
                paymentNode = `\n\nPartial payment received of amount $${(amount / 100).toFixed(2)}`;
                break;
            }
            case amount > invoiceAmountCents: {
                const message = `Invalid payment amount for invoice ${invoiceId}. Payment exceeds invoice amount.`;
                trackTrace(message, undefined, { invoiceId, amount });
                return { Success: false, Message: message, InvoiceId: invoiceId };
            }
            default: {
                const message = `Invalid payment amount for invoice ${invoiceId}. Payment cannot be $0`;
                trackTrace(message, undefined, { invoiceId, amount });
                return { Success: false, Message: message, InvoiceId: invoiceId };
            }
        }

        trackEvent('Mock_Use_Stripe_Payment', { invoiceId, amount, paymentMethodId });
        // MOCK PAYMENT PROCESSING - REMOVE THIS BLOCK WHEN READY TO PROCESS REAL PAYMENTS
        await new Promise(resolve => setTimeout(resolve, 1000)); // simulate delay

        // const start = Date.now();

        // const paymentIntent = await stripe.paymentIntents.create({
        //     amount: amount * 100, // amount in cents
        //     currency: 'usd',
        //     payment_method: paymentMethodId,
        //     confirmation_method: 'manual',
        //     confirm: true,
        //     metadata: {
        //         paymentId: invoiceId,
        //         invoiceNumber: invoiceDetails.id,
        //         customerName: invoiceDetails.name,
        //     },
        // });

        // trackDependency({
        //     target: 'Stripe',
        //     name: 'PaymentIntent:create',
        //     data: `invoice/${invoiceId}`,
        //     durationMs: Date.now() - start,
        //     resultCode: paymentIntent.status,
        //     success: paymentIntent.status === 'succeeded',
        //     dependencyTypeName: 'Stripe'
        // });

        // if (paymentIntent.status === 'requires_action') {
        //     trackEvent('PayInvoice_RequiresAction via Stripe', { invoiceId });
        //     return {
        //         Success: false,
        //         Message: 'Stripe: Payment requires additional action',
        //         InvoiceId: invoiceId,
        //     };
        // }

        try {
            // update invoice in DB
            const updateInvoiceResult = await updateInvoice({
                id: invoiceId,
                status: invoiceStatus,
                name: invoiceDetails.name,
                amount: invoiceDetails.amount,
                notes: invoiceDetails.notes,
                contact: invoiceDetails.contact,
                dueDate: invoiceDetails.dueDate
            });

            console.log('Invoice updated successfully after payment:', updateInvoiceResult);

            trackEvent('PayInvoice_Success', { invoiceId });

            return {
                Success: true,
                Message: 'Payment processed and invoice updated',
                InvoiceId: invoiceId
            };
        } catch (error) {
            trackException(error, { invoiceId });
            return {
                Success: false,
                Message: 'Payment processed but failed to update invoice: ' + error.message,
                InvoiceId: invoiceId
            };
        }
    } catch (error: any) {
        console.error('Stripe error:', error.message);
        trackException(error, { invoiceId });
        return {
            Success: false,
            Message: 'Stripe error: ' + error.message,
            InvoiceId: invoiceId,
        };
    }
}