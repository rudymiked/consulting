import { InvoiceRequest, Invoice } from "./models";
import { trackEvent, trackDependency, trackException, trackTrace } from './telemetry';
import { insertEntity, queryEntities, updateEntity } from './tableClientHelper';

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