import { InvoiceData } from "./models";
import { trackEvent, trackDependency, trackException, trackTrace } from './telemetry';
import { insertEntity, queryEntities, updateEntity } from './tableClientHelper';

export const getInvoiceDetails = async (invoiceId: string) => {
    const tableName = "invoices";

    trackEvent('GetInvoice_Attempt', { invoiceId });
    const filter = `RowKey eq '${invoiceId}'`;
    const entities = await queryEntities(tableName, filter);

    if (entities && entities.length > 0) {
        const entity = entities[0];
        const result = {
            invoiceId: entity.rowKey,
            status: entity.status,
            clientName: entity.name,
            amount: entity.amount,
            notes: entity.notes,
            contact: entity.contact
        };
        trackEvent('GetInvoice_Success', { invoiceId });
        return result;
    }

    trackTrace(`Invoice ${invoiceId} not found`, undefined, { invoiceId });
    const err = new Error("Invoice not found");
    trackException(err, { invoiceId });
    throw err;
}

export const createInvoice = async (invoiceData: InvoiceData) => {
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
        throw new Error("Failed to create invoice" + (error?.message ?? ''));
    }
}

export const updateInvoice = async (invoiceData: InvoiceData) => {
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
        throw new Error("Failed to update invoice");
    }
}