import { InvoiceData } from "./models";
import { TableClient } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";

export const getInvoiceDetails = async (invoiceId: string) => {
    const account = "rudyard9e11";
    const tableName = "invoices";

    const credential = new DefaultAzureCredential();
    const tableClient = new TableClient(
    `https://${account}.table.core.windows.net`,
    tableName,
    credential
    );

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

export const saveInvoice = async (invoiceData: InvoiceData) => {
    const account = "rudyard9e11";
    const tableName = "invoices";

    const credential = new DefaultAzureCredential();
    const tableClient = new TableClient(
    `https://${account}.table.core.windows.net`,
    tableName,
    credential
    );

    const entity = {
        partitionKey: invoiceData.contact || "default",
        rowKey: invoiceData.id,
        ...invoiceData,
    };

    await tableClient.createEntity(entity).then(() => {
        console.log("Invoice saved successfully:", entity)
        return {
            success: true,
            message: "Invoice saved successfully",
            invoiceId: invoiceData.id,
        };
    }).catch((error) => {
        console.error("Error saving invoice:", error)
        throw new Error("Failed to save invoice")    
    });
}