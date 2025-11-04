import { InvoiceData } from "./models";
import { TableClient } from "@azure/data-tables";
import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity";
import { trackEvent, trackDependency, trackException, trackTrace } from './telemetry';

export const getInvoiceDetails = async (invoiceId: string) => {
    const account = process.env.RUDYARD_STORAGE_ACCOUNT_NAME;
    const tableName = "invoices";

    // If a connection string is provided (useful for local development), prefer it.
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    let tableClient: TableClient;
    if (connectionString) {
        console.log("Using AZURE_STORAGE_CONNECTION_STRING for TableClient");
        tableClient = TableClient.fromConnectionString(connectionString, tableName);
    } else {
        // Use DefaultAzureCredential which will pick up managed identity in Azure App Service
        console.log("Using DefaultAzureCredential (managed identity / environment creds) for TableClient");
        const credential = new ManagedIdentityCredential(process.env.RUDYARD_MANAGED_IDENTITY_CLIENT_ID!);
        tableClient = new TableClient(`https://${account}.table.core.windows.net`, tableName, credential);
    }

    trackEvent('GetInvoice_Attempt', { invoiceId });
    const entities = tableClient.listEntities<InvoiceData>({
        queryOptions: {
            filter: `RowKey eq '${invoiceId}'`
        }
    });

    for await (const entity of entities) {
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
    // no match is found
    const err = new Error("Invoice not found");
    trackException(err, { invoiceId });
    throw err;
}

export const createInvoice = async (invoiceData: InvoiceData) => {
    const account = process.env.RUDYARD_STORAGE_ACCOUNT_NAME;
    const tableName = "invoices";

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    let tableClient: TableClient;
    if (connectionString) {
        console.log("Using AZURE_STORAGE_CONNECTION_STRING for TableClient");
        tableClient = TableClient.fromConnectionString(connectionString, tableName);
    } else {
        console.log("Using DefaultAzureCredential (managed identity / environment creds) for TableClient");
        const credential = new DefaultAzureCredential();
        tableClient = new TableClient(`https://${account}.table.core.windows.net`, tableName, credential);
    }

    const entity = {
        partitionKey: invoiceData.contact || "default",
        rowKey: invoiceData.id,
        ...invoiceData,
    };

    trackEvent('CreateInvoice_Attempt', { invoiceId: invoiceData.id, client: invoiceData.contact });
    const start = Date.now();
    try {
        await tableClient.createEntity(entity);
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
    const account = process.env.RUDYARD_STORAGE_ACCOUNT_NAME;
    const tableName = "invoices";

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    let tableClient: TableClient;
    if (connectionString) {
        console.log("Using AZURE_STORAGE_CONNECTION_STRING for TableClient");
        tableClient = TableClient.fromConnectionString(connectionString, tableName);
    } else {
        console.log("Using DefaultAzureCredential (managed identity / environment creds) for TableClient");
        const credential = new DefaultAzureCredential();
        tableClient = new TableClient(`https://${account}.table.core.windows.net`, tableName, credential);
    }

    const entity = {
        partitionKey: invoiceData.contact || "default",
        rowKey: invoiceData.id,
        ...invoiceData,
    };

    trackEvent('UpdateInvoice_Attempt', { invoiceId: invoiceData.id });
    const start = Date.now();
    try {
        // Update by merging properties; will throw if entity doesn't exist
        await tableClient.updateEntity(entity, "Merge");
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