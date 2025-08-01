import { ManagedIdentityCredential } from "@azure/identity";
import { TableClient } from "@azure/data-tables";

const credential = new ManagedIdentityCredential(process.env.RUDYARD_MANAGED_IDENTITY_CLIENT_ID!);

// Helper to create a client for any table
export function getTableClient(tableName: string): TableClient {
  return new TableClient(
    `https://${process.env.RUDYARD_STORAGE_ACCOUNT_NAME}.table.core.windows.net`,
    tableName,
    credential
  );
}

export async function insertEntity(tableName: string, entity: any): Promise<void> {
  const client = getTableClient(tableName);
  try {
    await client.createEntity(entity);
    console.log(`Entity inserted into ${tableName}:`, entity);
  } catch (error) {
    console.error(`Error inserting entity into ${tableName}:`, error);
    throw error;
  }
}

export async function queryEntities(tableName: string, filter: string): Promise<any[]> {
  const client = getTableClient(tableName);
  try {
    const entities = [];
    for await (const entity of client.listEntities({ queryOptions: { filter } })) {
      entities.push(entity);
    }
    return entities;
  } catch (error) {
    console.error(`Error querying entities from ${tableName}:`, error);
    throw error;
  }
}

export async function deleteEntity(tableName: string, partitionKey: string, rowKey: string): Promise<void> {
  const client = getTableClient(tableName);
  try {
    await client.deleteEntity(partitionKey, rowKey);
    console.log(`Entity with PartitionKey: ${partitionKey}, RowKey: ${rowKey} deleted from ${tableName}.`);
  } catch (error) {
    console.error(`Error deleting entity from ${tableName}:`, error);
    throw error;
  }
}

export async function updateEntity(tableName: string, entity: any): Promise<void> {
  const client = getTableClient(tableName);
  try {
    await client.updateEntity(entity, "Merge");
    console.log(`Entity updated in ${tableName}:`, entity);
  } catch (error) {
    console.error(`Error updating entity in ${tableName}:`, error);
    throw error;
  }
}