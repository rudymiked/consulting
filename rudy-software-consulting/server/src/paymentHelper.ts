import { InvoiceData } from "./models";
import { TableClient } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";

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
        const credential = new DefaultAzureCredential();
        tableClient = new TableClient(`https://${account}.table.core.windows.net`, tableName, credential);
    }

    const entities = tableClient.listEntities<InvoiceData>({
        queryOptions: {
            filter: `RowKey eq '${invoiceId}'`
        }
    });
    
    for await (const entity of entities) {
        return {
            invoiceId: entity.rowKey,
            status: entity.status,
            clientName: entity.name,
            amount: entity.amount,
            notes: entity.notes,
            contact: entity.contact
        };
    }

    // no match is found
    throw new Error("Invoice not found");
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

    try {
        await tableClient.createEntity(entity);
        console.log("Invoice created successfully:", entity);
        return {
            success: true,
            message: "Invoice created successfully",
            invoiceId: invoiceData.id,
        } as const;
    } catch (error) {
        console.error("Error creating invoice:", error);
        throw new Error("Failed to create invoice" + error.message);
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

    try {
        // Update by merging properties; will throw if entity doesn't exist
        await tableClient.updateEntity(entity, "Merge");
        console.log("Invoice updated successfully:", entity);
        return {
            success: true,
            message: "Invoice updated successfully",
            invoiceId: invoiceData.id,
        } as const;
    } catch (error) {
        console.error("Error updating invoice:", error);
        throw new Error("Failed to update invoice");
    }
}